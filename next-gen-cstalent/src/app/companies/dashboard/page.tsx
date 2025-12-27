/**
 * Company Dashboard Page
 * View and manage sent candidates
 */

'use client';

import { useState, useEffect, useCallback, useMemo, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import styles from './page.module.css';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Types
type CandidateStatus = 'sent' | 'company_interested' | 'interview_scheduled' | 'hired' | 'rejected';

interface Company {
  id: string;
  company_name: string;
  subscription_tier: 'starter' | 'growth' | 'enterprise';
  candidates_sent_this_month: number;
  max_candidates_per_month: number;
}

interface Student {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  major: string | null;
  graduation_year: number | null;
  gpa: number | null;
  location: string | null;
  technical_skills: string[];
  overall_score: number | null;
  resume_url: string | null;
}

interface Assessment {
  problem_solving: number;
  code_quality: number;
  technical_knowledge: number;
  debugging_ability: number;
  technical_total: number;
  communication_skills: number;
  problem_approach: number;
  cultural_fit: number;
  behavioral_total: number;
  bonus_points: number;
  total_score: number;
  strengths: string | null;
  areas_for_improvement: string | null;
  recommendation: string | null;
}

interface Candidate {
  id: string;
  status: CandidateStatus;
  sent_date: string;
  company_notes: string | null;
  interview_scheduled_date: string | null;
  position_title: string | null;
  student: Student;
  assessment: Assessment | null;
}

// Tab config
interface TabConfig {
  id: string;
  label: string;
  status: CandidateStatus | null;
}

const TABS: TabConfig[] = [
  { id: 'all', label: 'All Candidates', status: null },
  { id: 'interested', label: 'Interested', status: 'company_interested' },
  { id: 'hired', label: 'Hired', status: 'hired' },
];

// Status config
const STATUS_CONFIG: Record<CandidateStatus, { label: string; colorClass: string }> = {
  sent: { label: 'New', colorClass: 'statusSent' },
  company_interested: { label: 'Interested', colorClass: 'statusInterested' },
  interview_scheduled: { label: 'Interview Scheduled', colorClass: 'statusInterview' },
  hired: { label: 'Hired', colorClass: 'statusHired' },
  rejected: { label: 'Rejected', colorClass: 'statusRejected' },
};

export default function CompanyDashboardPage() {
  return (
    <ProtectedRoute allowedRoles={['company']}>
      <Suspense fallback={<LoadingState />}>
        <CompanyDashboard />
      </Suspense>
    </ProtectedRoute>
  );
}

function LoadingState() {
  return (
    <div className={styles.container}>
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}></div>
        <p className={styles.loadingText}>Loading dashboard...</p>
      </div>
    </div>
  );
}

function CompanyDashboard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const [supabase] = useState(() => createClient(supabaseUrl, supabaseAnonKey));

  // State
  const [company, setCompany] = useState<Company | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Modal state
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [showModal, setShowModal] = useState(false);

  // Schedule interview state
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [schedulingCandidate, setSchedulingCandidate] = useState<Candidate | null>(null);
  const [meetingLink, setMeetingLink] = useState('');
  const [interviewDate, setInterviewDate] = useState('');

  // Messages
  const [success, setSuccess] = useState<string | null>(null);

  // Get active tab from URL
  const activeTab = searchParams.get('tab') || 'all';

  // Fetch company data
  const fetchCompanyData = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      // Get company for this user
      const { data: companyData, error: companyError } = await supabase
        .from('companies')
        .select('id, company_name, subscription_tier, candidates_sent_this_month, max_candidates_per_month')
        .eq('auth_user_id', user.id)
        .single();

      if (companyError) throw companyError;
      setCompany(companyData);

      // Fetch candidates
      const { data: submissions, error: submissionsError } = await supabase
        .from('candidate_submissions')
        .select(`
          id,
          status,
          sent_date,
          company_notes,
          interview_scheduled_date,
          requirement_id,
          students (
            id,
            first_name,
            last_name,
            email,
            major,
            graduation_year,
            gpa,
            location,
            technical_skills,
            overall_score,
            resume_url
          )
        `)
        .eq('company_id', companyData.id)
        .neq('status', 'rejected')
        .order('sent_date', { ascending: false });

      if (submissionsError) throw submissionsError;

      // Get requirement IDs for position titles
      const requirementIds = [...new Set((submissions || []).map(s => s.requirement_id).filter(Boolean))];
      let requirementsMap: Record<string, string> = {};

      if (requirementIds.length > 0) {
        const { data: requirements } = await supabase
          .from('company_requirements')
          .select('id, position_title')
          .in('id', requirementIds);

        (requirements || []).forEach((r: { id: string; position_title: string }) => {
          requirementsMap[r.id] = r.position_title;
        });
      }

      // Get student IDs for assessments
      const studentIds = (submissions || []).map((s: { students: { id: string } | { id: string }[] }) => {
        const student = Array.isArray(s.students) ? s.students[0] : s.students;
        return student?.id;
      }).filter(Boolean);

      let assessmentsMap: Record<string, Assessment> = {};

      if (studentIds.length > 0) {
        const { data: assessments } = await supabase
          .from('interview_assessments')
          .select(`
            student_id,
            problem_solving,
            code_quality,
            technical_knowledge,
            debugging_ability,
            technical_total,
            communication_skills,
            problem_approach,
            cultural_fit,
            behavioral_total,
            bonus_points,
            total_score,
            strengths,
            areas_for_improvement,
            recommendation
          `)
          .in('student_id', studentIds)
          .order('created_at', { ascending: false });

        // Use most recent assessment per student
        (assessments || []).forEach((a: Assessment & { student_id: string }) => {
          if (!assessmentsMap[a.student_id]) {
            assessmentsMap[a.student_id] = a;
          }
        });
      }

      // Transform data
      const transformedCandidates: Candidate[] = (submissions || []).map((sub: {
        id: string;
        status: CandidateStatus;
        sent_date: string;
        company_notes: string | null;
        interview_scheduled_date: string | null;
        requirement_id: string | null;
        students: Student | Student[];
      }) => {
        const student = Array.isArray(sub.students) ? sub.students[0] : sub.students;
        return {
          id: sub.id,
          status: sub.status,
          sent_date: sub.sent_date,
          company_notes: sub.company_notes,
          interview_scheduled_date: sub.interview_scheduled_date,
          position_title: sub.requirement_id ? requirementsMap[sub.requirement_id] || null : null,
          student: {
            ...student,
            technical_skills: student?.technical_skills || [],
          },
          assessment: student?.id ? assessmentsMap[student.id] || null : null,
        };
      });

      setCandidates(transformedCandidates);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }, [user, supabase]);

  useEffect(() => {
    fetchCompanyData();
  }, [fetchCompanyData]);

  // Filter candidates by tab
  const filteredCandidates = useMemo(() => {
    const tab = TABS.find(t => t.id === activeTab);
    if (!tab || tab.status === null) return candidates;
    return candidates.filter(c => c.status === tab.status);
  }, [candidates, activeTab]);

  // Tab counts
  const tabCounts = useMemo(() => ({
    all: candidates.length,
    interested: candidates.filter(c => c.status === 'company_interested').length,
    hired: candidates.filter(c => c.status === 'hired').length,
  }), [candidates]);

  // Handle tab change
  const handleTabChange = (tabId: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (tabId === 'all') {
      params.delete('tab');
    } else {
      params.set('tab', tabId);
    }
    router.push(`/companies/dashboard?${params.toString()}`);
  };

  // Update candidate status
  const updateStatus = async (candidateId: string, newStatus: CandidateStatus, notes?: string) => {
    setProcessingId(candidateId);
    try {
      const updateData: Record<string, unknown> = { status: newStatus };
      if (notes) updateData.company_notes = notes;

      const { error } = await supabase
        .from('candidate_submissions')
        .update(updateData)
        .eq('id', candidateId);

      if (error) throw error;

      // Update local state
      setCandidates(prev => prev.map(c => 
        c.id === candidateId ? { ...c, status: newStatus, company_notes: notes || c.company_notes } : c
      ));

      setSuccess(`Candidate marked as ${STATUS_CONFIG[newStatus].label}`);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error updating status:', err);
      setError(err instanceof Error ? err.message : 'Failed to update status');
    } finally {
      setProcessingId(null);
    }
  };

  // Handle mark interested
  const handleMarkInterested = (candidateId: string) => {
    updateStatus(candidateId, 'company_interested');
  };

  // Handle reject
  const handleReject = async (candidateId: string) => {
    const confirmed = window.confirm('Are you sure you want to reject this candidate?');
    if (!confirmed) return;

    const notes = window.prompt('Add a reason (optional):');
    
    setProcessingId(candidateId);
    try {
      const updateData: Record<string, unknown> = { status: 'rejected' };
      if (notes) updateData.company_notes = notes;

      const { error } = await supabase
        .from('candidate_submissions')
        .update(updateData)
        .eq('id', candidateId);

      if (error) throw error;

      // Remove from list
      setCandidates(prev => prev.filter(c => c.id !== candidateId));
      setSuccess('Candidate rejected');
      setTimeout(() => setSuccess(null), 3000);

      if (showModal) setShowModal(false);
    } catch (err) {
      console.error('Error rejecting:', err);
      setError(err instanceof Error ? err.message : 'Failed to reject');
    } finally {
      setProcessingId(null);
    }
  };

  // Handle schedule interview
  const openScheduleModal = (candidate: Candidate) => {
    setSchedulingCandidate(candidate);
    setMeetingLink('');
    setInterviewDate('');
    setShowScheduleModal(true);
  };

  const handleScheduleInterview = async () => {
    if (!schedulingCandidate || !meetingLink || !interviewDate) return;

    // Validate meeting link
    if (!meetingLink.startsWith('http')) {
      setError('Please enter a valid meeting URL');
      return;
    }

    setProcessingId(schedulingCandidate.id);
    try {
      // Update submission
      const { error: updateError } = await supabase
        .from('candidate_submissions')
        .update({
          status: 'interview_scheduled',
          interview_scheduled_date: interviewDate,
        })
        .eq('id', schedulingCandidate.id);

      if (updateError) throw updateError;

      // Create calendar event
      const { error: eventError } = await supabase
        .from('calendar_events')
        .insert({
          event_type: 'company_interview',
          title: `Interview: ${schedulingCandidate.student.first_name} ${schedulingCandidate.student.last_name}`,
          student_id: schedulingCandidate.student.id,
          company_id: company?.id,
          start_time: interviewDate,
          end_time: new Date(new Date(interviewDate).getTime() + 60 * 60 * 1000).toISOString(),
          meeting_link: meetingLink,
          status: 'scheduled',
        });

      if (eventError) console.error('Calendar event error:', eventError);

      // Update local state
      setCandidates(prev => prev.map(c =>
        c.id === schedulingCandidate.id
          ? { ...c, status: 'interview_scheduled', interview_scheduled_date: interviewDate }
          : c
      ));

      setShowScheduleModal(false);
      setSchedulingCandidate(null);
      setSuccess('Interview scheduled successfully!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error scheduling:', err);
      setError(err instanceof Error ? err.message : 'Failed to schedule interview');
    } finally {
      setProcessingId(null);
    }
  };

  // Handle hire
  const handleHire = async (candidateId: string) => {
    const confirmed = window.confirm('Mark this candidate as hired?');
    if (!confirmed) return;

    updateStatus(candidateId, 'hired');
    if (showModal) setShowModal(false);
  };

  // Open profile modal
  const openProfileModal = (candidate: Candidate) => {
    setSelectedCandidate(candidate);
    setShowModal(true);
  };

  // Download resume
  const handleDownloadResume = async (resumeUrl: string) => {
    if (!resumeUrl) return;

    try {
      const { data, error } = await supabase.storage
        .from('resumes')
        .createSignedUrl(resumeUrl, 60);

      if (error) throw error;
      window.open(data.signedUrl, '_blank');
    } catch (err) {
      console.error('Error downloading resume:', err);
      setError('Failed to download resume');
    }
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  // Get score color
  const getScoreClass = (score: number | null): string => {
    if (score === null) return '';
    if (score >= 80) return styles.scoreHigh;
    if (score >= 60) return styles.scoreMedium;
    return styles.scoreLow;
  };

  // Calculate usage percentage
  const usagePercentage = company
    ? (company.candidates_sent_this_month / company.max_candidates_per_month) * 100
    : 0;

  // Error state
  if (error && !company) {
    return (
      <div className={styles.container}>
        <div className={styles.errorContainer}>
          <span className={styles.errorIcon}>⚠️</span>
          <h2>Unable to Load Dashboard</h2>
          <p>{error}</p>
          <button onClick={fetchCompanyData} className={styles.retryButton}>
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Page Header */}
      <header className={styles.header}>
        <h1 className={styles.title}>
          {company ? `Welcome, ${company.company_name}` : 'Company Dashboard'}
        </h1>
        <p className={styles.subtitle}>Manage your candidate pipeline</p>
      </header>

      {/* Messages */}
      {error && (
        <div className={styles.errorMessage}>
          <span>⚠️</span> {error}
          <button onClick={() => setError(null)} className={styles.dismissButton}>✕</button>
        </div>
      )}
      {success && (
        <div className={styles.successMessage}>
          <span>✓</span> {success}
        </div>
      )}

      {loading ? (
        <LoadingState />
      ) : (
        <>
          {/* Subscription Usage Card */}
          {company && (
            <div className={styles.usageCard}>
              <div className={styles.usageHeader}>
                <div>
                  <span className={styles.planBadge}>{company.subscription_tier}</span>
                  <span className={styles.planLabel}>Current Plan</span>
                </div>
                {usagePercentage >= 80 && (
                  <a href="/companies/upgrade" className={styles.upgradeLink}>
                    Upgrade Plan →
                  </a>
                )}
              </div>
              <div className={styles.usageStats}>
                <span className={styles.usageText}>
                  <strong>{company.candidates_sent_this_month}</strong> / {company.max_candidates_per_month} candidates this month
                </span>
              </div>
              <div className={styles.progressBarContainer}>
                <div
                  className={`${styles.progressBar} ${usagePercentage >= 100 ? styles.progressFull : usagePercentage >= 80 ? styles.progressWarning : ''}`}
                  style={{ width: `${Math.min(100, usagePercentage)}%` }}
                />
              </div>
              {usagePercentage >= 100 && (
                <p className={styles.limitWarning}>You&apos;ve reached your monthly limit. Upgrade to receive more candidates.</p>
              )}
            </div>
          )}

          {/* Tabs */}
          <nav className={styles.tabsContainer}>
            <div className={styles.tabs}>
              {TABS.map(tab => (
                <button
                  key={tab.id}
                  className={`${styles.tab} ${activeTab === tab.id ? styles.tabActive : ''}`}
                  onClick={() => handleTabChange(tab.id)}
                >
                  {tab.label}
                  <span className={styles.tabCount}>{tabCounts[tab.id as keyof typeof tabCounts]}</span>
                </button>
              ))}
            </div>
          </nav>

          {/* Candidates Grid */}
          {filteredCandidates.length === 0 ? (
            <div className={styles.emptyState}>
              <span className={styles.emptyIcon}>👥</span>
              <h2>No candidates {activeTab !== 'all' ? `marked as ${TABS.find(t => t.id === activeTab)?.label}` : ''}</h2>
              <p>
                {activeTab === 'all'
                  ? 'Candidates sent to you will appear here.'
                  : `Candidates you mark as "${TABS.find(t => t.id === activeTab)?.label}" will appear here.`}
              </p>
            </div>
          ) : (
            <div className={styles.candidatesGrid}>
              {filteredCandidates.map(candidate => (
                <CandidateCard
                  key={candidate.id}
                  candidate={candidate}
                  processingId={processingId}
                  onViewProfile={() => openProfileModal(candidate)}
                  onMarkInterested={() => handleMarkInterested(candidate.id)}
                  onScheduleInterview={() => openScheduleModal(candidate)}
                  onReject={() => handleReject(candidate.id)}
                  onHire={() => handleHire(candidate.id)}
                  getScoreClass={getScoreClass}
                  formatDate={formatDate}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* Profile Modal */}
      {showModal && selectedCandidate && (
        <ProfileModal
          candidate={selectedCandidate}
          processingId={processingId}
          onClose={() => setShowModal(false)}
          onMarkInterested={() => handleMarkInterested(selectedCandidate.id)}
          onScheduleInterview={() => {
            setShowModal(false);
            openScheduleModal(selectedCandidate);
          }}
          onReject={() => handleReject(selectedCandidate.id)}
          onHire={() => handleHire(selectedCandidate.id)}
          onDownloadResume={() => handleDownloadResume(selectedCandidate.student.resume_url || '')}
          getScoreClass={getScoreClass}
        />
      )}

      {/* Schedule Interview Modal */}
      {showScheduleModal && schedulingCandidate && (
        <div className={styles.modalOverlay} onClick={() => setShowScheduleModal(false)}>
          <div className={styles.scheduleModal} onClick={e => e.stopPropagation()}>
            <button className={styles.modalClose} onClick={() => setShowScheduleModal(false)}>✕</button>
            <h2 className={styles.scheduleTitle}>Schedule Interview</h2>
            <p className={styles.scheduleName}>
              with {schedulingCandidate.student.first_name} {schedulingCandidate.student.last_name}
            </p>

            <div className={styles.scheduleForm}>
              <div className={styles.formGroup}>
                <label>Interview Date & Time *</label>
                <input
                  type="datetime-local"
                  value={interviewDate}
                  onChange={e => setInterviewDate(e.target.value)}
                  className={styles.input}
                />
              </div>
              <div className={styles.formGroup}>
                <label>Meeting Link (Zoom/Google Meet) *</label>
                <input
                  type="url"
                  value={meetingLink}
                  onChange={e => setMeetingLink(e.target.value)}
                  placeholder="https://zoom.us/j/..."
                  className={styles.input}
                />
              </div>
              <button
                onClick={handleScheduleInterview}
                disabled={!meetingLink || !interviewDate || processingId === schedulingCandidate.id}
                className={styles.scheduleButton}
              >
                {processingId === schedulingCandidate.id ? 'Scheduling...' : 'Schedule Interview'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Candidate Card Component
interface CandidateCardProps {
  candidate: Candidate;
  processingId: string | null;
  onViewProfile: () => void;
  onMarkInterested: () => void;
  onScheduleInterview: () => void;
  onReject: () => void;
  onHire: () => void;
  getScoreClass: (score: number | null) => string;
  formatDate: (date: string) => string;
}

function CandidateCard({
  candidate,
  processingId,
  onViewProfile,
  onMarkInterested,
  onScheduleInterview,
  onReject,
  onHire,
  getScoreClass,
  formatDate,
}: CandidateCardProps) {
  const isProcessing = processingId === candidate.id;
  const statusConfig = STATUS_CONFIG[candidate.status];

  return (
    <article className={styles.candidateCard}>
      <div className={styles.cardHeader}>
        <h3 className={styles.candidateName}>
          {candidate.student.first_name} {candidate.student.last_name}
        </h3>
        <span className={`${styles.statusBadge} ${styles[statusConfig.colorClass]}`}>
          {statusConfig.label}
        </span>
      </div>

      {candidate.position_title && (
        <p className={styles.positionTitle}>{candidate.position_title}</p>
      )}

      <div className={styles.candidateInfo}>
        <p>{candidate.student.major || 'No major'} • Class of {candidate.student.graduation_year || 'N/A'}</p>
        {candidate.student.gpa && <p>GPA: {candidate.student.gpa.toFixed(2)}</p>}
        {candidate.student.location && <p>📍 {candidate.student.location}</p>}
      </div>

      {candidate.student.technical_skills.length > 0 && (
        <div className={styles.skillsContainer}>
          {candidate.student.technical_skills.slice(0, 5).map((skill, i) => (
            <span key={i} className={styles.skillTag}>{skill}</span>
          ))}
          {candidate.student.technical_skills.length > 5 && (
            <span className={styles.skillMore}>+{candidate.student.technical_skills.length - 5}</span>
          )}
        </div>
      )}

      <div className={styles.cardFooter}>
        <div className={styles.footerLeft}>
          {candidate.student.overall_score !== null && (
            <span className={`${styles.scoreBadge} ${getScoreClass(candidate.student.overall_score)}`}>
              {candidate.student.overall_score}/100
            </span>
          )}
          <span className={styles.sentDate}>Sent {formatDate(candidate.sent_date)}</span>
        </div>
      </div>

      <div className={styles.cardActions}>
        <button onClick={onViewProfile} className={styles.viewButton}>
          View Profile
        </button>
        {candidate.status === 'sent' && (
          <>
            <button
              onClick={onMarkInterested}
              disabled={isProcessing}
              className={styles.interestedButton}
            >
              Interested
            </button>
            <button
              onClick={onScheduleInterview}
              disabled={isProcessing}
              className={styles.scheduleBtn}
            >
              Schedule
            </button>
          </>
        )}
        {candidate.status === 'company_interested' && (
          <button
            onClick={onScheduleInterview}
            disabled={isProcessing}
            className={styles.scheduleBtn}
          >
            Schedule Interview
          </button>
        )}
        {candidate.status === 'interview_scheduled' && (
          <button
            onClick={onHire}
            disabled={isProcessing}
            className={styles.hireButton}
          >
            Mark Hired
          </button>
        )}
        {candidate.status !== 'hired' && candidate.status !== 'rejected' && (
          <button
            onClick={onReject}
            disabled={isProcessing}
            className={styles.rejectButton}
          >
            Reject
          </button>
        )}
      </div>
    </article>
  );
}

// Profile Modal Component
interface ProfileModalProps {
  candidate: Candidate;
  processingId: string | null;
  onClose: () => void;
  onMarkInterested: () => void;
  onScheduleInterview: () => void;
  onReject: () => void;
  onHire: () => void;
  onDownloadResume: () => void;
  getScoreClass: (score: number | null) => string;
}

function ProfileModal({
  candidate,
  processingId,
  onClose,
  onMarkInterested,
  onScheduleInterview,
  onReject,
  onHire,
  onDownloadResume,
  getScoreClass,
}: ProfileModalProps) {
  const isProcessing = processingId === candidate.id;
  const { student, assessment } = candidate;

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <button className={styles.modalClose} onClick={onClose}>✕</button>

        <div className={styles.modalHeader}>
          <h2>{student.first_name} {student.last_name}</h2>
          <span className={`${styles.statusBadge} ${styles[STATUS_CONFIG[candidate.status].colorClass]}`}>
            {STATUS_CONFIG[candidate.status].label}
          </span>
        </div>

        <div className={styles.modalContent}>
          {/* Contact */}
          <section className={styles.modalSection}>
            <h3>Contact</h3>
            <p>📧 {student.email}</p>
            {student.location && <p>📍 {student.location}</p>}
          </section>

          {/* Education */}
          <section className={styles.modalSection}>
            <h3>Education</h3>
            <p><strong>Major:</strong> {student.major || 'Not specified'}</p>
            <p><strong>Graduation Year:</strong> {student.graduation_year || 'Not specified'}</p>
            <p><strong>GPA:</strong> {student.gpa ? student.gpa.toFixed(2) : 'Not specified'}</p>
          </section>

          {/* Technical Skills */}
          {student.technical_skills.length > 0 && (
            <section className={styles.modalSection}>
              <h3>Technical Skills</h3>
              <div className={styles.skillsContainer}>
                {student.technical_skills.map((skill, i) => (
                  <span key={i} className={styles.skillTag}>{skill}</span>
                ))}
              </div>
            </section>
          )}

          {/* Assessment Scores */}
          {assessment && (
            <section className={styles.modalSection}>
              <h3>Interview Assessment</h3>
              <div className={styles.assessmentGrid}>
                <div className={styles.assessmentBlock}>
                  <h4>Technical ({assessment.technical_total}/50)</h4>
                  <div className={styles.scoreRow}>
                    <span>Problem Solving</span>
                    <span>{assessment.problem_solving}/15</span>
                  </div>
                  <div className={styles.scoreRow}>
                    <span>Code Quality</span>
                    <span>{assessment.code_quality}/15</span>
                  </div>
                  <div className={styles.scoreRow}>
                    <span>Technical Knowledge</span>
                    <span>{assessment.technical_knowledge}/10</span>
                  </div>
                  <div className={styles.scoreRow}>
                    <span>Debugging</span>
                    <span>{assessment.debugging_ability}/10</span>
                  </div>
                </div>

                <div className={styles.assessmentBlock}>
                  <h4>Behavioral ({assessment.behavioral_total}/30)</h4>
                  <div className={styles.scoreRow}>
                    <span>Communication</span>
                    <span>{assessment.communication_skills}/10</span>
                  </div>
                  <div className={styles.scoreRow}>
                    <span>Problem Approach</span>
                    <span>{assessment.problem_approach}/10</span>
                  </div>
                  <div className={styles.scoreRow}>
                    <span>Cultural Fit</span>
                    <span>{assessment.cultural_fit}/10</span>
                  </div>
                </div>
              </div>

              <div className={styles.totalScoreBox}>
                <span className={styles.totalLabel}>Total Score</span>
                <span className={`${styles.totalValue} ${getScoreClass(assessment.total_score)}`}>
                  {assessment.total_score}/100
                </span>
              </div>

              {assessment.strengths && (
                <div className={styles.feedbackBlock}>
                  <h4>Strengths</h4>
                  <p>{assessment.strengths}</p>
                </div>
              )}

              {assessment.recommendation && (
                <div className={styles.recommendationBadge}>
                  Recommendation: <strong>{assessment.recommendation.replace('_', ' ')}</strong>
                </div>
              )}
            </section>
          )}

          {/* Resume */}
          {student.resume_url && (
            <section className={styles.modalSection}>
              <button onClick={onDownloadResume} className={styles.downloadButton}>
                📄 Download Resume
              </button>
            </section>
          )}
        </div>

        {/* Modal Actions */}
        <div className={styles.modalActions}>
          {candidate.status === 'sent' && (
            <button onClick={onMarkInterested} disabled={isProcessing} className={styles.interestedButton}>
              Mark Interested
            </button>
          )}
          {(candidate.status === 'sent' || candidate.status === 'company_interested') && (
            <button onClick={onScheduleInterview} disabled={isProcessing} className={styles.scheduleBtn}>
              Schedule Interview
            </button>
          )}
          {candidate.status === 'interview_scheduled' && (
            <button onClick={onHire} disabled={isProcessing} className={styles.hireButton}>
              Mark as Hired
            </button>
          )}
          {candidate.status !== 'hired' && (
            <button onClick={onReject} disabled={isProcessing} className={styles.rejectButton}>
              Reject
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

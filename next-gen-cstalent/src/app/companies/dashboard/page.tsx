/**
 * Company Dashboard - Overview Page
 * High-level metrics and quick actions for company users
 */

'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter } from 'next/navigation';
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
  linkedin_profile: string | null;
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
  requirement_id: string | null;
  student: Student;
  assessment: Assessment | null;
}

// Status config with icons
const STATUS_CONFIG: Record<CandidateStatus, { label: string; colorClass: string; icon: string }> = {
  sent: { label: 'New', colorClass: 'statusNew', icon: '✨' },
  company_interested: { label: 'Interested', colorClass: 'statusInterested', icon: '👍' },
  interview_scheduled: { label: 'Interview Scheduled', colorClass: 'statusInterview', icon: '📅' },
  hired: { label: 'Hired', colorClass: 'statusHired', icon: '🎉' },
  rejected: { label: 'Not a Fit', colorClass: 'statusRejected', icon: '✗' },
};

interface DashboardStats {
  totalCandidates: number;
  pendingReview: number;
  interested: number;
  inInterviews: number;
  hired: number;
  thisMonth: number;
}

interface RecentCandidate {
  id: string;
  studentName: string;
  status: CandidateStatus;
  sentDate: string;
  positionTitle: string | null;
  score: number | null;
  // Full candidate data for modal
  fullCandidate?: Candidate;
}

interface UpcomingInterview {
  id: string;
  studentName: string;
  positionTitle: string | null;
  scheduledDate: string;
}

interface QuickAction {
  id: string;
  icon: string;
  label: string;
  description: string;
  href: string;
  color: string;
}

const QUICK_ACTIONS: QuickAction[] = [
  {
    id: 'candidates',
    icon: '👥',
    label: 'View All Candidates',
    description: 'Browse and manage your candidate pipeline',
    href: '/companies/candidates',
    color: 'primary',
  },
  {
    id: 'requirements',
    icon: '📋',
    label: 'Manage Requirements',
    description: 'Update job requirements and positions',
    href: '/companies/requirements',
    color: 'secondary',
  },
  {
    id: 'settings',
    icon: '⚙️',
    label: 'Company Settings',
    description: 'Update company profile and preferences',
    href: '/companies/register',
    color: 'tertiary',
  },
];

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
  const { user } = useAuth();
  const [supabase] = useState(() => createClient(supabaseUrl, supabaseAnonKey));

  // State
  const [company, setCompany] = useState<Company | null>(null);
  const [stats, setStats] = useState<DashboardStats>({
    totalCandidates: 0,
    pendingReview: 0,
    interested: 0,
    inInterviews: 0,
    hired: 0,
    thisMonth: 0,
  });
  const [recentCandidates, setRecentCandidates] = useState<RecentCandidate[]>([]);
  const [upcomingInterviews, setUpcomingInterviews] = useState<UpcomingInterview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Modal state
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Schedule interview state
  const [interviewDate, setInterviewDate] = useState('');
  const [interviewDuration, setInterviewDuration] = useState('60');
  const [meetingLink, setMeetingLink] = useState('');
  const [interviewType, setInterviewType] = useState('video');

  // Fetch dashboard data
  const fetchDashboardData = useCallback(async () => {
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

      // Fetch all candidate submissions for stats
      const { data: allSubmissions, error: submissionsError } = await supabase
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
            resume_url,
            linkedin_profile
          )
        `)
        .eq('company_id', companyData.id)
        .order('sent_date', { ascending: false });

      if (submissionsError) throw submissionsError;

      // Get requirement info for position titles
      const requirementIds = [...new Set((allSubmissions || []).map(s => s.requirement_id).filter(Boolean))];
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

      // Calculate stats
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      
      const submissions = allSubmissions || [];
      const activeSubmissions = submissions.filter(s => s.status !== 'rejected');
      
      const calculatedStats: DashboardStats = {
        totalCandidates: activeSubmissions.length,
        pendingReview: submissions.filter(s => s.status === 'sent').length,
        interested: submissions.filter(s => s.status === 'company_interested').length,
        inInterviews: submissions.filter(s => s.status === 'interview_scheduled').length,
        hired: submissions.filter(s => s.status === 'hired').length,
        thisMonth: submissions.filter(s => new Date(s.sent_date) >= startOfMonth).length,
      };
      setStats(calculatedStats);

      // Get student IDs for fetching assessments
      const studentIds = activeSubmissions.slice(0, 5).map((s: { students: Student | Student[] }) => {
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

        (assessments || []).forEach((a: Assessment & { student_id: string }) => {
          if (!assessmentsMap[a.student_id]) {
            assessmentsMap[a.student_id] = a;
          }
        });
      }

      // Get recent candidates (last 5) with full data for modal
      const recent: RecentCandidate[] = activeSubmissions.slice(0, 5).map((sub: {
        id: string;
        status: CandidateStatus;
        sent_date: string;
        company_notes: string | null;
        interview_scheduled_date: string | null;
        requirement_id: string | null;
        students: Student | Student[];
      }) => {
        const student = Array.isArray(sub.students) ? sub.students[0] : sub.students;
        const fullStudent: Student = student ? {
          ...student,
          technical_skills: student.technical_skills || [],
        } : {
          id: '',
          first_name: 'Unknown',
          last_name: '',
          email: '',
          major: null,
          graduation_year: null,
          gpa: null,
          location: null,
          technical_skills: [],
          overall_score: null,
          resume_url: null,
          linkedin_profile: null,
        };
        
        return {
          id: sub.id,
          studentName: student ? `${student.first_name} ${student.last_name}` : 'Unknown',
          status: sub.status,
          sentDate: sub.sent_date,
          positionTitle: sub.requirement_id ? requirementsMap[sub.requirement_id] || null : null,
          score: student?.overall_score ?? null,
          fullCandidate: {
            id: sub.id,
            status: sub.status,
            sent_date: sub.sent_date,
            company_notes: sub.company_notes,
            interview_scheduled_date: sub.interview_scheduled_date,
            requirement_id: sub.requirement_id,
            position_title: sub.requirement_id ? requirementsMap[sub.requirement_id] || null : null,
            student: fullStudent,
            assessment: fullStudent.id ? assessmentsMap[fullStudent.id] || null : null,
          },
        };
      });
      setRecentCandidates(recent);

      // Get upcoming interviews
      const upcoming: UpcomingInterview[] = submissions
        .filter((s: { status: string; interview_scheduled_date: string | null }) => 
          s.status === 'interview_scheduled' && 
          s.interview_scheduled_date && 
          new Date(s.interview_scheduled_date) >= now
        )
        .sort((a: { interview_scheduled_date: string | null }, b: { interview_scheduled_date: string | null }) => 
          new Date(a.interview_scheduled_date!).getTime() - new Date(b.interview_scheduled_date!).getTime()
        )
        .slice(0, 3)
        .map((sub: {
          id: string;
          interview_scheduled_date: string | null;
          requirement_id: string | null;
          students: { first_name: string; last_name: string } | { first_name: string; last_name: string }[];
        }) => {
          const student = Array.isArray(sub.students) ? sub.students[0] : sub.students;
          return {
            id: sub.id,
            studentName: student ? `${student.first_name} ${student.last_name}` : 'Unknown',
            positionTitle: sub.requirement_id ? requirementsMap[sub.requirement_id] || null : null,
            scheduledDate: sub.interview_scheduled_date!,
          };
        });
      setUpcomingInterviews(upcoming);

    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }, [user, supabase]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Format date helpers
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  // Status labels
  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      sent: 'New',
      company_interested: 'Interested',
      interview_scheduled: 'Interview',
      hired: 'Hired',
    };
    return labels[status] || status;
  };

  // Calculate usage percentage
  const usagePercentage = company
    ? (company.candidates_sent_this_month / company.max_candidates_per_month) * 100
    : 0;

  // Get score color class
  const getScoreClass = (score: number | null): string => {
    if (score === null) return '';
    if (score >= 80) return styles.scoreHigh;
    if (score >= 60) return styles.scoreMedium;
    return styles.scoreLow;
  };

  // Format date for modal
  const formatDateFull = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  // Open profile modal
  const openProfileModal = (candidate: Candidate) => {
    setSelectedCandidate(candidate);
    setShowProfileModal(true);
  };

  // Update candidate status
  const updateStatus = async (candidateId: string, newStatus: CandidateStatus, additionalData?: Record<string, unknown>) => {
    setProcessingId(candidateId);
    try {
      const updateData: Record<string, unknown> = { status: newStatus, ...additionalData };

      const { error: updateError } = await supabase
        .from('candidate_submissions')
        .update(updateData)
        .eq('id', candidateId);

      if (updateError) throw updateError;

      // Update local state
      setRecentCandidates(prev => prev.map(c =>
        c.id === candidateId && c.fullCandidate
          ? { ...c, status: newStatus, fullCandidate: { ...c.fullCandidate, status: newStatus, ...additionalData } }
          : c
      ));

      if (selectedCandidate && selectedCandidate.id === candidateId) {
        setSelectedCandidate({ ...selectedCandidate, status: newStatus, ...additionalData });
      }

      setSuccess(`Candidate marked as ${STATUS_CONFIG[newStatus].label}`);
      setTimeout(() => setSuccess(null), 3000);

      // Refresh dashboard data to update stats
      fetchDashboardData();
    } catch (err) {
      console.error('Error updating status:', err);
      setError(err instanceof Error ? err.message : 'Failed to update status');
      setTimeout(() => setError(null), 5000);
    } finally {
      setProcessingId(null);
    }
  };

  // Handle mark interested
  const handleMarkInterested = () => {
    if (selectedCandidate) {
      updateStatus(selectedCandidate.id, 'company_interested');
    }
  };

  // Handle hire
  const handleHire = () => {
    if (selectedCandidate && window.confirm('Mark this candidate as hired?')) {
      updateStatus(selectedCandidate.id, 'hired');
    }
  };

  // Open schedule modal
  const openScheduleModal = () => {
    if (!selectedCandidate) return;
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(10, 0, 0, 0);
    setInterviewDate(tomorrow.toISOString().slice(0, 16));
    setInterviewDuration('60');
    setMeetingLink('');
    setInterviewType('video');
    setShowProfileModal(false);
    setShowScheduleModal(true);
  };

  // Handle schedule interview
  const handleScheduleInterview = async () => {
    if (!selectedCandidate || !meetingLink || !interviewDate) return;

    if (!meetingLink.startsWith('http')) {
      setError('Please enter a valid meeting URL');
      return;
    }

    const selectedDate = new Date(interviewDate);
    if (selectedDate <= new Date()) {
      setError('Please select a future date and time');
      return;
    }

    setProcessingId(selectedCandidate.id);
    setError(null);

    try {
      const startTime = new Date(interviewDate).toISOString();
      const endTime = new Date(selectedDate.getTime() + parseInt(interviewDuration) * 60 * 1000).toISOString();

      const { error: updateError } = await supabase
        .from('candidate_submissions')
        .update({
          status: 'interview_scheduled',
          interview_scheduled_date: startTime,
        })
        .eq('id', selectedCandidate.id);

      if (updateError) throw updateError;

      // Create calendar event
      await supabase.from('calendar_events').insert({
        event_type: 'company_interview',
        title: `${interviewType === 'video' ? 'Video' : interviewType === 'phone' ? 'Phone' : 'Technical'} Interview: ${selectedCandidate.student.first_name} ${selectedCandidate.student.last_name}`,
        student_id: selectedCandidate.student.id,
        company_id: company?.id,
        start_time: startTime,
        end_time: endTime,
        meeting_link: meetingLink,
        status: 'scheduled',
      });

      // Update local state
      setRecentCandidates(prev => prev.map(c =>
        c.id === selectedCandidate.id && c.fullCandidate
          ? { 
              ...c, 
              status: 'interview_scheduled' as CandidateStatus, 
              fullCandidate: { ...c.fullCandidate, status: 'interview_scheduled' as CandidateStatus, interview_scheduled_date: startTime } 
            }
          : c
      ));

      setShowScheduleModal(false);
      setSelectedCandidate(null);
      setSuccess('Interview scheduled successfully!');
      setTimeout(() => setSuccess(null), 3000);

      // Refresh dashboard data to update stats
      fetchDashboardData();
    } catch (err) {
      console.error('Error scheduling:', err);
      setError(err instanceof Error ? err.message : 'Failed to schedule interview');
      setTimeout(() => setError(null), 5000);
    } finally {
      setProcessingId(null);
    }
  };

  // Download resume
  const handleDownloadResume = async (resumeUrl: string) => {
    if (!resumeUrl) return;
    try {
      const { data, error: downloadError } = await supabase.storage
        .from('resumes')
        .createSignedUrl(resumeUrl, 60);
      if (downloadError) throw downloadError;
      window.open(data.signedUrl, '_blank');
    } catch (err) {
      console.error('Error downloading resume:', err);
      setError('Failed to download resume');
      setTimeout(() => setError(null), 5000);
    }
  };

  // Error state
  if (error && !company) {
    return (
      <div className={styles.container}>
        <div className={styles.errorContainer}>
          <span className={styles.errorIcon}>⚠️</span>
          <h2>Unable to Load Dashboard</h2>
          <p>{error}</p>
          <button onClick={fetchDashboardData} className={styles.retryButton}>
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
        <div className={styles.headerContent}>
          <div>
            <h1 className={styles.title}>
              Welcome back{company ? `, ${company.company_name}` : ''}
            </h1>
            <p className={styles.subtitle}>Here&apos;s what&apos;s happening with your talent pipeline</p>
          </div>
          <button 
            onClick={() => router.push('/companies/candidates')}
            className={styles.primaryButton}
          >
            View All Candidates →
          </button>
        </div>
      </header>

      {loading ? (
        <LoadingState />
      ) : (
        <>
          {/* Stats Overview */}
          <section className={styles.statsSection}>
            <div className={styles.statsGrid}>
              <div className={styles.statCard}>
                <div className={styles.statIcon}>👥</div>
                <div className={styles.statContent}>
                  <span className={styles.statValue}>{stats.totalCandidates}</span>
                  <span className={styles.statLabel}>Total Candidates</span>
                </div>
              </div>
              
              <div className={`${styles.statCard} ${styles.statPending}`}>
                <div className={styles.statIcon}>📬</div>
                <div className={styles.statContent}>
                  <span className={styles.statValue}>{stats.pendingReview}</span>
                  <span className={styles.statLabel}>Pending Review</span>
                </div>
                {stats.pendingReview > 0 && (
                  <span className={styles.statBadge}>Action needed</span>
                )}
              </div>
              
              <div className={styles.statCard}>
                <div className={styles.statIcon}>⭐</div>
                <div className={styles.statContent}>
                  <span className={styles.statValue}>{stats.interested}</span>
                  <span className={styles.statLabel}>Marked Interested</span>
                </div>
              </div>
              
              <div className={styles.statCard}>
                <div className={styles.statIcon}>📅</div>
                <div className={styles.statContent}>
                  <span className={styles.statValue}>{stats.inInterviews}</span>
                  <span className={styles.statLabel}>In Interviews</span>
                </div>
              </div>
              
              <div className={`${styles.statCard} ${styles.statHired}`}>
                <div className={styles.statIcon}>🎉</div>
                <div className={styles.statContent}>
                  <span className={styles.statValue}>{stats.hired}</span>
                  <span className={styles.statLabel}>Hired</span>
                </div>
              </div>
            </div>
          </section>

          {/* Subscription Usage */}
          {company && (
            <section className={styles.usageSection}>
              <div className={styles.usageCard}>
                <div className={styles.usageHeader}>
                  <div className={styles.usageTitle}>
                    <h3>Monthly Candidate Allowance</h3>
                    <span className={styles.planBadge}>{company.subscription_tier} plan</span>
                  </div>
                  {usagePercentage >= 80 && (
                    <a href="/companies/upgrade" className={styles.upgradeLink}>
                      Upgrade Plan →
                    </a>
                  )}
                </div>
                <div className={styles.usageStats}>
                  <span className={styles.usageCount}>
                    <strong>{company.candidates_sent_this_month}</strong> / {company.max_candidates_per_month}
                  </span>
                  <span className={styles.usageLabel}>candidates received this month</span>
                </div>
                <div className={styles.progressBarContainer}>
                  <div
                    className={`${styles.progressBar} ${usagePercentage >= 100 ? styles.progressFull : usagePercentage >= 80 ? styles.progressWarning : ''}`}
                    style={{ width: `${Math.min(100, usagePercentage)}%` }}
                  />
                </div>
                {usagePercentage >= 100 && (
                  <p className={styles.limitWarning}>
                    ⚠️ You&apos;ve reached your monthly limit. Upgrade to receive more candidates.
                  </p>
                )}
              </div>
            </section>
          )}

          {/* Main Content Grid */}
          <div className={styles.contentGrid}>
            {/* Quick Actions */}
            <section className={styles.actionsSection}>
              <h2 className={styles.sectionTitle}>Quick Actions</h2>
              <div className={styles.actionsList}>
                {QUICK_ACTIONS.map(action => (
                  <button
                    key={action.id}
                    onClick={() => router.push(action.href)}
                    className={`${styles.actionCard} ${styles.actionPrimary}`}
                  >
                    <><span className={styles.actionIcon}>{action.icon}</span><div className={styles.actionContent}>
                        <span className={styles.actionLabel}>{action.label}</span>
                        <span className={styles.actionDescription}>{action.description}</span>
                      </div><span className={styles.actionArrow}>→</span></>
                  </button>
                ))}
              </div>
            </section>

            {/* Recent Candidates */}
            <section className={styles.recentSection}>
              <div className={styles.sectionHeader}>
                <h2 className={styles.sectionTitle}>Recent Candidates</h2>
                <button 
                  onClick={() => router.push('/companies/candidates')}
                  className={styles.viewAllLink}
                >
                  View all →
                </button>
              </div>
              {recentCandidates.length === 0 ? (
                <div className={styles.emptyCard}>
                  <span className={styles.emptyIcon}>👥</span>
                  <p>No candidates yet</p>
                  <span className={styles.emptyHint}>
                    Candidates matched to your requirements will appear here
                  </span>
                </div>
              ) : (
                <div className={styles.recentList}>
                  {recentCandidates.map(candidate => (
                    <div 
                      key={candidate.id} 
                      className={styles.recentCard}
                      onClick={() => candidate.fullCandidate && openProfileModal(candidate.fullCandidate)}
                    >
                      <div className={styles.recentMain}>
                        <span className={styles.recentName}>{candidate.studentName}</span>
                        {candidate.positionTitle && (
                          <span className={styles.recentPosition}>{candidate.positionTitle}</span>
                        )}
                      </div>
                      <div className={styles.recentMeta}>
                        {candidate.score !== null && (
                          <span className={styles.recentScore}>{candidate.score}/100</span>
                        )}
                        <span className={`${styles.recentStatus} ${styles['status' + candidate.status.charAt(0).toUpperCase() + candidate.status.slice(1).replace('_', '')]}`}>
                          {getStatusLabel(candidate.status)}
                        </span>
                      </div>
                      <span className={styles.recentDate}>{formatDate(candidate.sentDate)}</span>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Upcoming Interviews */}
            <section className={styles.interviewsSection}>
              <div className={styles.sectionHeader}>
                <h2 className={styles.sectionTitle}>Upcoming Interviews</h2>
              </div>
              {upcomingInterviews.length === 0 ? (
                <div className={styles.emptyCard}>
                  <span className={styles.emptyIcon}>📅</span>
                  <p>No upcoming interviews</p>
                  <span className={styles.emptyHint}>
                    Schedule interviews with interested candidates
                  </span>
                </div>
              ) : (
                <div className={styles.interviewsList}>
                  {upcomingInterviews.map(interview => (
                    <div key={interview.id} className={styles.interviewCard}>
                      <div className={styles.interviewIcon}>📅</div>
                      <div className={styles.interviewContent}>
                        <span className={styles.interviewName}>{interview.studentName}</span>
                        {interview.positionTitle && (
                          <span className={styles.interviewPosition}>{interview.positionTitle}</span>
                        )}
                        <span className={styles.interviewTime}>{formatDateTime(interview.scheduledDate)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>

          {/* Hiring Tips - Shown when they have pending candidates */}
          {stats.pendingReview > 0 && (
            <section className={styles.tipsSection}>
              <div className={styles.tipsCard}>
                <div className={styles.tipsHeader}>
                  <span className={styles.tipsIcon}>💡</span>
                  <h3>Quick Tips</h3>
                </div>
                <ul className={styles.tipsList}>
                  <li>You have <strong>{stats.pendingReview} candidates</strong> waiting for review</li>
                  <li>Mark candidates as &quot;Interested&quot; to unlock their contact info</li>
                  <li>Schedule interviews directly through the platform</li>
                  <li>Candidates are pre-vetted by TalentBridge with verified assessment scores</li>
                </ul>
                <button 
                  onClick={() => router.push('/companies/candidates?status=sent')}
                  className={styles.tipsButton}
                >
                  Review Pending Candidates
                </button>
              </div>
            </section>
          )}
        </>
      )}

      {/* Profile Modal */}
      {showProfileModal && selectedCandidate && (
        <ProfileModal
          candidate={selectedCandidate}
          processingId={processingId}
          onClose={() => { setShowProfileModal(false); setSelectedCandidate(null); }}
          onMarkInterested={handleMarkInterested}
          onScheduleInterview={openScheduleModal}
          onReject={() => { 
            setShowProfileModal(false); 
            router.push('/companies/candidates'); 
          }}
          onHire={handleHire}
          onDownloadResume={() => handleDownloadResume(selectedCandidate.student.resume_url || '')}
          getScoreClass={getScoreClass}
          formatDate={formatDateFull}
        />
      )}

      {/* Schedule Interview Modal */}
      {showScheduleModal && selectedCandidate && (
        <div className={styles.modalOverlay} onClick={() => setShowScheduleModal(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <button className={styles.modalClose} onClick={() => setShowScheduleModal(false)}>✕</button>
            <h2 className={styles.modalTitle}>Schedule Interview</h2>
            <p className={styles.modalSubtitle}>
              with {selectedCandidate.student.first_name} {selectedCandidate.student.last_name}
            </p>

            <div className={styles.formGroup}>
              <label>Interview Type</label>
              <select
                value={interviewType}
                onChange={e => setInterviewType(e.target.value)}
                className={styles.input}
              >
                <option value="phone">Phone Screen</option>
                <option value="video">Video Call</option>
                <option value="technical">Technical Interview</option>
                <option value="onsite">On-site</option>
              </select>
            </div>

            <div className={styles.formGroup}>
              <label>Date & Time *</label>
              <input
                type="datetime-local"
                value={interviewDate}
                onChange={e => setInterviewDate(e.target.value)}
                min={new Date().toISOString().slice(0, 16)}
                className={styles.input}
              />
            </div>

            <div className={styles.formGroup}>
              <label>Duration</label>
              <select
                value={interviewDuration}
                onChange={e => setInterviewDuration(e.target.value)}
                className={styles.input}
              >
                <option value="30">30 minutes</option>
                <option value="45">45 minutes</option>
                <option value="60">1 hour</option>
                <option value="90">1.5 hours</option>
              </select>
            </div>

            <div className={styles.formGroup}>
              <label>Meeting Link *</label>
              <input
                type="url"
                value={meetingLink}
                onChange={e => setMeetingLink(e.target.value)}
                placeholder="https://zoom.us/j/..."
                className={styles.input}
              />
            </div>

            <div className={styles.modalActions}>
              <button onClick={() => setShowScheduleModal(false)} className={styles.cancelBtn}>
                Cancel
              </button>
              <button
                onClick={handleScheduleInterview}
                disabled={!meetingLink || !interviewDate || processingId === selectedCandidate.id}
                className={styles.primaryBtn}
              >
                {processingId === selectedCandidate.id ? 'Scheduling...' : 'Schedule Interview'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success/Error Messages */}
      {success && (
        <div className={styles.toastSuccess}>
          <span>✓</span> {success}
        </div>
      )}
      {error && (
        <div className={styles.toastError}>
          <span>⚠️</span> {error}
        </div>
      )}
    </div>
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
  formatDate: (date: string) => string;
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
  formatDate,
}: ProfileModalProps) {
  const isProcessing = processingId === candidate.id;
  const { student, assessment } = candidate;
  const statusConfig = STATUS_CONFIG[candidate.status];

  // Only show contact info if status is interested or beyond
  const showContactInfo = candidate.status !== 'sent';

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.profileModal} onClick={e => e.stopPropagation()}>
        <button className={styles.modalClose} onClick={onClose}>✕</button>

        {/* Header */}
        <div className={styles.profileHeader}>
          <div className={styles.profileAvatar}>
            {student.first_name[0]}{student.last_name[0]}
          </div>
          <div className={styles.profileInfo}>
            <h2>{student.first_name} {student.last_name}</h2>
            <p>{student.major || 'No major'} • Class of {student.graduation_year || 'N/A'}</p>
            <span className={`${styles.statusBadge} ${styles[statusConfig.colorClass]}`}>
              {statusConfig.icon} {statusConfig.label}
            </span>
          </div>
          {assessment && (
            <div className={`${styles.profileScore} ${getScoreClass(assessment.total_score)}`}>
              <span className={styles.profileScoreValue}>{assessment.total_score}</span>
              <span className={styles.profileScoreLabel}>/100</span>
            </div>
          )}
        </div>

        <div className={styles.profileContent}>
          {/* Contact - only if interested or beyond */}
          {showContactInfo && (
            <section className={styles.profileSection}>
              <h3>Contact Information</h3>
              <div className={styles.contactGrid}>
                <div>📧 {student.email}</div>
                {student.location && <div>📍 {student.location}</div>}
              </div>
              <div className={styles.socialLinks}>
                {student.linkedin_profile && (
                  <a href={student.linkedin_profile} target="_blank" rel="noopener noreferrer" className={styles.socialLink}>
                    LinkedIn
                  </a>
                )}
              </div>
            </section>
          )}

          {!showContactInfo && (
            <section className={styles.profileSection}>
              <div className={styles.contactLocked}>
                <span>🔒</span>
                <p>Mark as &quot;Interested&quot; to view contact information</p>
              </div>
            </section>
          )}

          {/* Education */}
          <section className={styles.profileSection}>
            <h3>Education</h3>
            <div className={styles.detailGrid}>
              <div><strong>Major:</strong> {student.major || 'Not specified'}</div>
              <div><strong>Graduation:</strong> {student.graduation_year || 'Not specified'}</div>
              <div><strong>GPA:</strong> {student.gpa ? student.gpa.toFixed(2) : 'Not specified'}</div>
              {student.location && <div><strong>Location:</strong> {student.location}</div>}
            </div>
          </section>

          {/* Technical Skills */}
          {student.technical_skills.length > 0 && (
            <section className={styles.profileSection}>
              <h3>Technical Skills</h3>
              <div className={styles.skillTags}>
                {student.technical_skills.map((skill, i) => (
                  <span key={i} className={styles.skillTag}>{skill}</span>
                ))}
              </div>
            </section>
          )}

          {/* Assessment */}
          {assessment && (
            <section className={styles.profileSection}>
              <h3>TalentBridge Assessment</h3>
              <div className={styles.assessmentGrid}>
                <div className={styles.assessmentBlock}>
                  <h4>Technical ({assessment.technical_total}/50)</h4>
                  <div className={styles.scoreRow}><span>Problem Solving</span><span>{assessment.problem_solving}/15</span></div>
                  <div className={styles.scoreRow}><span>Code Quality</span><span>{assessment.code_quality}/15</span></div>
                  <div className={styles.scoreRow}><span>Technical Knowledge</span><span>{assessment.technical_knowledge}/10</span></div>
                  <div className={styles.scoreRow}><span>Debugging</span><span>{assessment.debugging_ability}/10</span></div>
                </div>
                <div className={styles.assessmentBlock}>
                  <h4>Behavioral ({assessment.behavioral_total}/30)</h4>
                  <div className={styles.scoreRow}><span>Communication</span><span>{assessment.communication_skills}/10</span></div>
                  <div className={styles.scoreRow}><span>Problem Approach</span><span>{assessment.problem_approach}/10</span></div>
                  <div className={styles.scoreRow}><span>Cultural Fit</span><span>{assessment.cultural_fit}/10</span></div>
                </div>
              </div>

              {assessment.strengths && (
                <div className={styles.feedbackBlock}>
                  <h4>Strengths</h4>
                  <p>{assessment.strengths}</p>
                </div>
              )}

              {assessment.recommendation && (
                <div className={styles.recommendationBadge}>
                  TalentBridge Recommendation: <strong>{assessment.recommendation.replace(/_/g, ' ')}</strong>
                </div>
              )}
            </section>
          )}

          {/* Timeline */}
          <section className={styles.profileSection}>
            <h3>Timeline</h3>
            <div className={styles.timeline}>
              <div className={styles.timelineItem}>
                <span className={styles.timelineDate}>{formatDate(candidate.sent_date)}</span>
                <span className={styles.timelineEvent}>Presented by TalentBridge</span>
              </div>
              {candidate.status !== 'sent' && (
                <div className={styles.timelineItem}>
                  <span className={styles.timelineDate}>—</span>
                  <span className={styles.timelineEvent}>Marked as {statusConfig.label}</span>
                </div>
              )}
              {candidate.interview_scheduled_date && (
                <div className={styles.timelineItem}>
                  <span className={styles.timelineDate}>{formatDate(candidate.interview_scheduled_date)}</span>
                  <span className={styles.timelineEvent}>Interview Scheduled</span>
                </div>
              )}
            </div>
          </section>

          {/* Notes */}
          {candidate.company_notes && (
            <section className={styles.profileSection}>
              <h3>Your Notes</h3>
              <p className={styles.notesText}>{candidate.company_notes}</p>
            </section>
          )}

          {/* Resume */}
          {student.resume_url && (
            <section className={styles.profileSection}>
              <button onClick={onDownloadResume} className={styles.downloadBtn}>
                📄 Download Resume
              </button>
            </section>
          )}
        </div>

        {/* Actions */}
        <div className={styles.profileActions}>
          {candidate.status === 'sent' && (
            <button onClick={onMarkInterested} disabled={isProcessing} className={styles.interestedBtn}>
              👍 Mark Interested
            </button>
          )}
          {(candidate.status === 'sent' || candidate.status === 'company_interested') && (
            <button onClick={onScheduleInterview} disabled={isProcessing} className={styles.scheduleBtn}>
              📅 Schedule Interview
            </button>
          )}
          {candidate.status === 'interview_scheduled' && (
            <button onClick={onHire} disabled={isProcessing} className={styles.hireBtn}>
              🎉 Mark as Hired
            </button>
          )}
          {candidate.status !== 'hired' && candidate.status !== 'rejected' && (
            <button onClick={onReject} disabled={isProcessing} className={styles.rejectBtn}>
              Not a Fit
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

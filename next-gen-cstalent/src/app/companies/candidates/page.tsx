/**
 * Company Candidates Page
 * View and manage candidates sent by TalentBridge
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

interface Position {
  id: string;
  position_title: string;
}

// Status config with icons
const STATUS_CONFIG: Record<CandidateStatus, { label: string; colorClass: string; icon: string }> = {
  sent: { label: 'New', colorClass: 'statusNew', icon: '✨' },
  company_interested: { label: 'Interested', colorClass: 'statusInterested', icon: '👍' },
  interview_scheduled: { label: 'Interview Scheduled', colorClass: 'statusInterview', icon: '📅' },
  hired: { label: 'Hired', colorClass: 'statusHired', icon: '🎉' },
  rejected: { label: 'Not a Fit', colorClass: 'statusRejected', icon: '✗' },
};

// Filter status options
const STATUS_FILTER_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'sent', label: 'New' },
  { value: 'company_interested', label: 'Interested' },
  { value: 'interview_scheduled', label: 'Interview Scheduled' },
  { value: 'hired', label: 'Hired' },
  { value: 'rejected', label: 'Not a Fit' },
];

// Sort options
const SORT_OPTIONS = [
  { value: 'sent_date_desc', label: 'Most Recent' },
  { value: 'sent_date_asc', label: 'Oldest First' },
  { value: 'name_asc', label: 'Name (A-Z)' },
  { value: 'name_desc', label: 'Name (Z-A)' },
  { value: 'score_desc', label: 'Highest Score' },
  { value: 'score_asc', label: 'Lowest Score' },
];

export default function CompanyCandidatesPage() {
  return (
    <ProtectedRoute allowedRoles={['company']}>
      <Suspense fallback={<LoadingState />}>
        <CandidatesManagement />
      </Suspense>
    </ProtectedRoute>
  );
}

function LoadingState() {
  return (
    <div className={styles.container}>
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}></div>
        <p className={styles.loadingText}>Loading candidates...</p>
      </div>
    </div>
  );
}

function CandidatesManagement() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const [supabase] = useState(() => createClient(supabaseUrl, supabaseAnonKey));

  // State
  const [company, setCompany] = useState<Company | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Filter state from URL
  const statusFilter = searchParams.get('status') || '';
  const positionFilter = searchParams.get('position') || '';
  const sortBy = searchParams.get('sort') || 'sent_date_desc';
  const [searchInput, setSearchInput] = useState(searchParams.get('search') || '');
  const searchQuery = searchParams.get('search') || '';

  // Modal state
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showNotesModal, setShowNotesModal] = useState(false);

  // Schedule interview state
  const [interviewDate, setInterviewDate] = useState('');
  const [interviewDuration, setInterviewDuration] = useState('60');
  const [meetingLink, setMeetingLink] = useState('');
  const [interviewType, setInterviewType] = useState('video');

  // Reject state
  const [rejectReasons, setRejectReasons] = useState<string[]>([]);
  const [rejectFeedback, setRejectFeedback] = useState('');

  // Notes state
  const [noteText, setNoteText] = useState('');

  // Update URL params
  const updateParams = useCallback((updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === '') {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    });
    router.push(`/companies/candidates?${params.toString()}`);
  }, [router, searchParams]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput !== searchQuery) {
        updateParams({ search: searchInput || null });
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput, searchQuery, updateParams]);

  // Fetch data
  const fetchData = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      // Get company
      const { data: companyData, error: companyError } = await supabase
        .from('companies')
        .select('id, company_name, subscription_tier, candidates_sent_this_month, max_candidates_per_month')
        .eq('auth_user_id', user.id)
        .single();

      if (companyError) {
        console.error('Company fetch error:', companyError);
        if (companyError.code === 'PGRST116') {
          throw new Error('No company profile found. Please complete company registration first.');
        }
        throw new Error(companyError.message || 'Failed to load company data');
      }
      
      if (!companyData) {
        throw new Error('No company profile found for this account.');
      }
      
      setCompany(companyData);

      // Fetch positions
      const { data: positionsData } = await supabase
        .from('company_requirements')
        .select('id, position_title')
        .eq('company_id', companyData.id)
        .order('position_title');

      setPositions(positionsData || []);

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
          student_id,
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

      if (submissionsError) {
        console.error('Submissions error:', submissionsError);
        throw new Error(submissionsError.message || 'Failed to load candidates');
      }

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

      // Get assessments
      const studentIds = (submissions || []).map((s: { students: Student | Student[] }) => {
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
          requirement_id: sub.requirement_id,
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
      // Handle Supabase error objects which have a message property
      if (err && typeof err === 'object' && 'message' in err) {
        setError((err as { message: string }).message);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to load candidates');
      }
    } finally {
      setLoading(false);
    }
  }, [user, supabase]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Calculate stats
  const stats = useMemo(() => {
    const total = candidates.length;
    const newCount = candidates.filter(c => c.status === 'sent').length;
    const interested = candidates.filter(c => c.status === 'company_interested').length;
    const interviewing = candidates.filter(c => c.status === 'interview_scheduled').length;
    const hired = candidates.filter(c => c.status === 'hired').length;
    const rejected = candidates.filter(c => c.status === 'rejected').length;
    return { total, newCount, interested, interviewing, hired, rejected };
  }, [candidates]);

  // Filter and sort candidates
  const filteredCandidates = useMemo(() => {
    let filtered = [...candidates];

    // Status filter
    if (statusFilter) {
      filtered = filtered.filter(c => c.status === statusFilter);
    }

    // Position filter
    if (positionFilter) {
      filtered = filtered.filter(c => c.requirement_id === positionFilter);
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(c => {
        const student = c.student;
        return (
          `${student.first_name} ${student.last_name}`.toLowerCase().includes(query) ||
          student.email.toLowerCase().includes(query) ||
          student.major?.toLowerCase().includes(query) ||
          student.technical_skills.some(s => s.toLowerCase().includes(query))
        );
      });
    }

    // Sort
    const [sortField, sortDir] = sortBy.split('_');
    filtered.sort((a, b) => {
      let comparison = 0;
      if (sortField === 'sent' && sortDir === 'date') {
        // Handle sent_date specially
        comparison = new Date(a.sent_date).getTime() - new Date(b.sent_date).getTime();
        return sortBy === 'sent_date_desc' ? -comparison : comparison;
      } else if (sortField === 'name') {
        comparison = `${a.student.first_name} ${a.student.last_name}`.localeCompare(
          `${b.student.first_name} ${b.student.last_name}`
        );
      } else if (sortField === 'score') {
        comparison = (a.assessment?.total_score || 0) - (b.assessment?.total_score || 0);
      }
      return sortDir === 'desc' ? -comparison : comparison;
    });

    return filtered;
  }, [candidates, statusFilter, positionFilter, searchQuery, sortBy]);

  // Update candidate status
  const updateStatus = async (candidateId: string, newStatus: CandidateStatus, additionalData?: Record<string, unknown>) => {
    setProcessingId(candidateId);
    try {
      const updateData: Record<string, unknown> = { status: newStatus, ...additionalData };

      const { error } = await supabase
        .from('candidate_submissions')
        .update(updateData)
        .eq('id', candidateId);

      if (error) throw error;

      setCandidates(prev => prev.map(c =>
        c.id === candidateId ? { ...c, status: newStatus, ...additionalData } : c
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
  const handleMarkInterested = (candidate: Candidate) => {
    updateStatus(candidate.id, 'company_interested');
  };

  // Open schedule modal
  const openScheduleModal = (candidate: Candidate) => {
    setSelectedCandidate(candidate);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(10, 0, 0, 0);
    setInterviewDate(tomorrow.toISOString().slice(0, 16));
    setInterviewDuration('60');
    setMeetingLink('');
    setInterviewType('video');
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

      setCandidates(prev => prev.map(c =>
        c.id === selectedCandidate.id
          ? { ...c, status: 'interview_scheduled', interview_scheduled_date: startTime }
          : c
      ));

      setShowScheduleModal(false);
      setSelectedCandidate(null);
      setSuccess('Interview scheduled successfully!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error scheduling:', err);
      setError(err instanceof Error ? err.message : 'Failed to schedule interview');
    } finally {
      setProcessingId(null);
    }
  };

  // Open reject modal
  const openRejectModal = (candidate: Candidate) => {
    setSelectedCandidate(candidate);
    setRejectReasons([]);
    setRejectFeedback('');
    setShowRejectModal(true);
  };

  // Handle reject
  const handleReject = async () => {
    if (!selectedCandidate) return;

    setProcessingId(selectedCandidate.id);
    try {
      const notes = [
        rejectReasons.length > 0 ? `Reasons: ${rejectReasons.join(', ')}` : '',
        rejectFeedback ? `Feedback: ${rejectFeedback}` : '',
      ].filter(Boolean).join('\n');

      const { error } = await supabase
        .from('candidate_submissions')
        .update({
          status: 'rejected',
          company_notes: notes || null,
        })
        .eq('id', selectedCandidate.id);

      if (error) throw error;

      setCandidates(prev => prev.map(c =>
        c.id === selectedCandidate.id
          ? { ...c, status: 'rejected', company_notes: notes }
          : c
      ));

      setShowRejectModal(false);
      setSelectedCandidate(null);
      setSuccess('Candidate marked as not a fit');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error rejecting:', err);
      setError(err instanceof Error ? err.message : 'Failed to update status');
    } finally {
      setProcessingId(null);
    }
  };

  // Handle hire
  const handleHire = (candidate: Candidate) => {
    if (window.confirm('Mark this candidate as hired?')) {
      updateStatus(candidate.id, 'hired');
    }
  };

  // Open notes modal
  const openNotesModal = (candidate: Candidate) => {
    setSelectedCandidate(candidate);
    setNoteText(candidate.company_notes || '');
    setShowNotesModal(true);
  };

  // Save notes
  const handleSaveNotes = async () => {
    if (!selectedCandidate) return;

    setProcessingId(selectedCandidate.id);
    try {
      const { error } = await supabase
        .from('candidate_submissions')
        .update({ company_notes: noteText })
        .eq('id', selectedCandidate.id);

      if (error) throw error;

      setCandidates(prev => prev.map(c =>
        c.id === selectedCandidate.id ? { ...c, company_notes: noteText } : c
      ));

      setShowNotesModal(false);
      setSuccess('Notes saved');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error saving notes:', err);
      setError(err instanceof Error ? err.message : 'Failed to save notes');
    } finally {
      setProcessingId(null);
    }
  };

  // Open profile modal
  const openProfileModal = (candidate: Candidate) => {
    setSelectedCandidate(candidate);
    setShowProfileModal(true);
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

  // Get score color class
  const getScoreClass = (score: number | null): string => {
    if (score === null) return '';
    if (score >= 80) return styles.scoreHigh;
    if (score >= 60) return styles.scoreMedium;
    return styles.scoreLow;
  };

  // Clear filters
  const clearFilters = () => {
    setSearchInput('');
    router.push('/companies/candidates');
  };

  const hasActiveFilters = statusFilter || positionFilter || searchQuery;

  // Error state
  if (error && !company) {
    return (
      <div className={styles.container}>
        <div className={styles.errorContainer}>
          <span className={styles.errorIcon}>⚠️</span>
          <h2>Unable to Load Candidates</h2>
          <p>{error}</p>
          <button onClick={fetchData} className={styles.retryButton}>Try Again</button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Page Header */}
      <header className={styles.header}>
        <div className={styles.headerTop}>
          <div>
            <h1 className={styles.title}>Your Candidates</h1>
            <p className={styles.subtitle}>
              Candidates presented to you by TalentBridge
            </p>
          </div>
        </div>
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
          {/* Stats Cards */}
          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <span className={styles.statValue}>{stats.total}</span>
              <span className={styles.statLabel}>Total Presented</span>
            </div>
            <div className={`${styles.statCard} ${styles.statNew}`}>
              <span className={styles.statValue}>{stats.newCount}</span>
              <span className={styles.statLabel}>Pending Review</span>
            </div>
            <div className={`${styles.statCard} ${styles.statInterested}`}>
              <span className={styles.statValue}>{stats.interested}</span>
              <span className={styles.statLabel}>Interested</span>
            </div>
            <div className={`${styles.statCard} ${styles.statInterview}`}>
              <span className={styles.statValue}>{stats.interviewing}</span>
              <span className={styles.statLabel}>In Interviews</span>
            </div>
            <div className={`${styles.statCard} ${styles.statHired}`}>
              <span className={styles.statValue}>{stats.hired}</span>
              <span className={styles.statLabel}>Hired</span>
            </div>
          </div>

          {/* Filters */}
          <div className={styles.filterBar}>
            <div className={styles.searchContainer}>
              <span className={styles.searchIcon}>🔍</span>
              <input
                type="text"
                placeholder="Search by name, skills, or major..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className={styles.searchInput}
              />
              {searchInput && (
                <button onClick={() => setSearchInput('')} className={styles.clearSearch}>✕</button>
              )}
            </div>

            <div className={styles.filters}>
              <select
                value={statusFilter}
                onChange={(e) => updateParams({ status: e.target.value || null })}
                className={styles.filterSelect}
              >
                {STATUS_FILTER_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>

              {positions.length > 0 && (
                <select
                  value={positionFilter}
                  onChange={(e) => updateParams({ position: e.target.value || null })}
                  className={styles.filterSelect}
                >
                  <option value="">All Positions</option>
                  {positions.map(pos => (
                    <option key={pos.id} value={pos.id}>{pos.position_title}</option>
                  ))}
                </select>
              )}

              <select
                value={sortBy}
                onChange={(e) => updateParams({ sort: e.target.value })}
                className={styles.filterSelect}
              >
                {SORT_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>

              {hasActiveFilters && (
                <button onClick={clearFilters} className={styles.clearFiltersButton}>
                  Clear Filters
                </button>
              )}
            </div>
          </div>

          {/* Results count */}
          <div className={styles.resultsInfo}>
            Showing {filteredCandidates.length} of {candidates.length} candidates
          </div>

          {/* Candidates Table */}
          {filteredCandidates.length === 0 ? (
            <div className={styles.emptyState}>
              <span className={styles.emptyIcon}>👥</span>
              {hasActiveFilters ? (
                <>
                  <h2>No candidates match your filters</h2>
                  <p>Try adjusting your search or filter criteria</p>
                  <button onClick={clearFilters} className={styles.clearFiltersButton}>
                    Clear Filters
                  </button>
                </>
              ) : (
                <>
                  <h2>No candidates yet</h2>
                  <p>TalentBridge is working on finding the perfect matches for your roles. We&apos;ll notify you when we have candidates to present.</p>
                </>
              )}
            </div>
          ) : (
            <div className={styles.tableContainer}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Candidate</th>
                    <th>Skills</th>
                    <th>Score</th>
                    <th>Position</th>
                    <th>Presented</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCandidates.map(candidate => (
                    <tr key={candidate.id} className={styles.tableRow}>
                      <td className={styles.candidateCell}>
                        <button
                          onClick={() => openProfileModal(candidate)}
                          className={styles.candidateNameBtn}
                        >
                          <span className={styles.avatar}>
                            {candidate.student.first_name[0]}{candidate.student.last_name[0]}
                          </span>
                          <div className={styles.candidateInfo}>
                            <span className={styles.candidateName}>
                              {candidate.student.first_name} {candidate.student.last_name}
                            </span>
                            <span className={styles.candidateMeta}>
                              {candidate.student.major || 'No major'} • {candidate.student.graduation_year || 'N/A'}
                            </span>
                          </div>
                        </button>
                      </td>
                      <td className={styles.skillsCell}>
                        <div className={styles.skillTags}>
                          {candidate.student.technical_skills.slice(0, 3).map((skill, i) => (
                            <span key={i} className={styles.skillTag}>{skill}</span>
                          ))}
                          {candidate.student.technical_skills.length > 3 && (
                            <span className={styles.skillMore}>+{candidate.student.technical_skills.length - 3}</span>
                          )}
                        </div>
                      </td>
                      <td>
                        {candidate.assessment ? (
                          <span className={`${styles.scoreBadge} ${getScoreClass(candidate.assessment.total_score)}`}>
                            {candidate.assessment.total_score}/100
                          </span>
                        ) : (
                          <span className={styles.noScore}>—</span>
                        )}
                      </td>
                      <td>
                        {candidate.position_title ? (
                          <span className={styles.positionTag}>{candidate.position_title}</span>
                        ) : (
                          <span className={styles.noPosition}>—</span>
                        )}
                      </td>
                      <td className={styles.dateCell}>
                        {formatDate(candidate.sent_date)}
                      </td>
                      <td>
                        <span className={`${styles.statusBadge} ${styles[STATUS_CONFIG[candidate.status].colorClass]}`}>
                          {STATUS_CONFIG[candidate.status].icon} {STATUS_CONFIG[candidate.status].label}
                        </span>
                      </td>
                      <td className={styles.actionsCell}>
                        <div className={styles.actionButtons}>
                          <button
                            onClick={() => openProfileModal(candidate)}
                            className={styles.actionBtn}
                            title="View Profile"
                          >
                            👁️
                          </button>
                          {candidate.status === 'sent' && (
                            <>
                              <button
                                onClick={() => handleMarkInterested(candidate)}
                                disabled={processingId === candidate.id}
                                className={`${styles.actionBtn} ${styles.actionInterested}`}
                                title="Mark Interested"
                              >
                                👍
                              </button>
                              <button
                                onClick={() => openScheduleModal(candidate)}
                                disabled={processingId === candidate.id}
                                className={`${styles.actionBtn} ${styles.actionSchedule}`}
                                title="Schedule Interview"
                              >
                                📅
                              </button>
                            </>
                          )}
                          {candidate.status === 'company_interested' && (
                            <button
                              onClick={() => openScheduleModal(candidate)}
                              disabled={processingId === candidate.id}
                              className={`${styles.actionBtn} ${styles.actionSchedule}`}
                              title="Schedule Interview"
                            >
                              📅
                            </button>
                          )}
                          {candidate.status === 'interview_scheduled' && (
                            <button
                              onClick={() => handleHire(candidate)}
                              disabled={processingId === candidate.id}
                              className={`${styles.actionBtn} ${styles.actionHire}`}
                              title="Mark Hired"
                            >
                              🎉
                            </button>
                          )}
                          <button
                            onClick={() => openNotesModal(candidate)}
                            className={styles.actionBtn}
                            title="Add Notes"
                          >
                            📝
                          </button>
                          {candidate.status !== 'hired' && candidate.status !== 'rejected' && (
                            <button
                              onClick={() => openRejectModal(candidate)}
                              disabled={processingId === candidate.id}
                              className={`${styles.actionBtn} ${styles.actionReject}`}
                              title="Not a Fit"
                            >
                              ✗
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* Profile Modal */}
      {showProfileModal && selectedCandidate && (
        <ProfileModal
          candidate={selectedCandidate}
          processingId={processingId}
          onClose={() => { setShowProfileModal(false); setSelectedCandidate(null); }}
          onMarkInterested={() => handleMarkInterested(selectedCandidate)}
          onScheduleInterview={() => { setShowProfileModal(false); openScheduleModal(selectedCandidate); }}
          onReject={() => { setShowProfileModal(false); openRejectModal(selectedCandidate); }}
          onHire={() => handleHire(selectedCandidate)}
          onDownloadResume={() => handleDownloadResume(selectedCandidate.student.resume_url || '')}
          getScoreClass={getScoreClass}
          formatDate={formatDate}
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

      {/* Reject Modal */}
      {showRejectModal && selectedCandidate && (
        <div className={styles.modalOverlay} onClick={() => setShowRejectModal(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <button className={styles.modalClose} onClick={() => setShowRejectModal(false)}>✕</button>
            <h2 className={styles.modalTitle}>Not a Fit</h2>
            <p className={styles.modalSubtitle}>
              {selectedCandidate.student.first_name} {selectedCandidate.student.last_name}
            </p>

            <div className={styles.formGroup}>
              <label>Reason (select all that apply)</label>
              <div className={styles.checkboxGroup}>
                {[
                  'Technical skills mismatch',
                  'Experience level',
                  'Location/remote preference',
                  'Salary expectations',
                  'Timeline mismatch',
                  'Culture fit concerns',
                  'Position filled',
                  'Other',
                ].map(reason => (
                  <label key={reason} className={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      checked={rejectReasons.includes(reason)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setRejectReasons([...rejectReasons, reason]);
                        } else {
                          setRejectReasons(rejectReasons.filter(r => r !== reason));
                        }
                      }}
                    />
                    {reason}
                  </label>
                ))}
              </div>
            </div>

            <div className={styles.formGroup}>
              <label>Additional Feedback (optional)</label>
              <textarea
                value={rejectFeedback}
                onChange={e => setRejectFeedback(e.target.value)}
                placeholder="Any additional feedback..."
                className={styles.textarea}
                rows={3}
              />
            </div>

            <div className={styles.modalActions}>
              <button onClick={() => setShowRejectModal(false)} className={styles.cancelBtn}>
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={processingId === selectedCandidate.id}
                className={styles.rejectBtn}
              >
                {processingId === selectedCandidate.id ? 'Saving...' : 'Confirm Not a Fit'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notes Modal */}
      {showNotesModal && selectedCandidate && (
        <div className={styles.modalOverlay} onClick={() => setShowNotesModal(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <button className={styles.modalClose} onClick={() => setShowNotesModal(false)}>✕</button>
            <h2 className={styles.modalTitle}>Notes</h2>
            <p className={styles.modalSubtitle}>
              {selectedCandidate.student.first_name} {selectedCandidate.student.last_name}
            </p>

            <div className={styles.formGroup}>
              <textarea
                value={noteText}
                onChange={e => setNoteText(e.target.value)}
                placeholder="Add your notes about this candidate..."
                className={styles.textarea}
                rows={5}
              />
            </div>

            <div className={styles.modalActions}>
              <button onClick={() => setShowNotesModal(false)} className={styles.cancelBtn}>
                Cancel
              </button>
              <button
                onClick={handleSaveNotes}
                disabled={processingId === selectedCandidate.id}
                className={styles.primaryBtn}
              >
                {processingId === selectedCandidate.id ? 'Saving...' : 'Save Notes'}
              </button>
            </div>
          </div>
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

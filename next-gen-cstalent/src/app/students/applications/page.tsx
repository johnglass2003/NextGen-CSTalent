/**
 * Student Applications Page
 * Track application status with companies for NextGen CS Talent
 */

'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { useAuth } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import styles from './page.module.css';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Status types
type ApplicationStatus = 'sent' | 'company_interested' | 'interview_scheduled' | 'rejected';

// Tab configuration
interface TabConfig {
  id: string;
  label: string;
  status: ApplicationStatus | null; // null means "All"
  icon: string;
}

const TABS: TabConfig[] = [
  { id: 'all', label: 'All', status: null, icon: '📋' },
  { id: 'sent', label: 'Sent', status: 'sent', icon: '📤' },
  { id: 'company_interested', label: 'Company Interested', status: 'company_interested', icon: '💼' },
  { id: 'interview_scheduled', label: 'Interview Scheduled', status: 'interview_scheduled', icon: '📅' },
  { id: 'rejected', label: 'Rejected', status: 'rejected', icon: '❌' },
];

// Status display configuration
const STATUS_CONFIG: Record<ApplicationStatus, { label: string; icon: string; colorClass: string }> = {
  sent: { label: 'Sent', icon: '📤', colorClass: 'statusSent' },
  company_interested: { label: 'Company Interested', icon: '💼', colorClass: 'statusInterested' },
  interview_scheduled: { label: 'Interview Scheduled', icon: '📅', colorClass: 'statusInterview' },
  rejected: { label: 'Rejected', icon: '❌', colorClass: 'statusRejected' },
};

// Application data interface
interface Application {
  id: string;
  status: ApplicationStatus;
  sent_date: string;
  company_notes: string | null;
  interview_date: string | null;
  meeting_link: string | null;
  company: {
    id: string;
    company_name: string;
    logo_url: string | null;
  };
  position_title: string | null;
}

// Status counts interface
interface StatusCounts {
  all: number;
  sent: number;
  company_interested: number;
  interview_scheduled: number;
  rejected: number;
}

export default function StudentApplicationsPage() {
  return (
    <ProtectedRoute allowedRoles={['student']}>
      <Suspense fallback={<LoadingState />}>
        <ApplicationsContent />
      </Suspense>
    </ProtectedRoute>
  );
}

function LoadingState() {
  return (
    <div className={styles.container}>
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}></div>
        <p className={styles.loadingText}>Loading applications...</p>
      </div>
    </div>
  );
}

function ApplicationsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const [supabase] = useState(() => createClient(supabaseUrl, supabaseAnonKey));
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [statusCounts, setStatusCounts] = useState<StatusCounts>({
    all: 0,
    sent: 0,
    company_interested: 0,
    interview_scheduled: 0,
    rejected: 0,
  });

  // Get active tab from URL or default to 'all'
  const activeTab = searchParams.get('status') || 'all';

  // Fetch student ID from auth user
  const fetchStudentId = useCallback(async (): Promise<string | null> => {
    if (!user) return null;

    const { data: student, error } = await supabase
      .from('students')
      .select('id')
      .eq('auth_user_id', user.id)
      .single();

    if (error || !student) {
      console.error('Error fetching student:', error);
      return null;
    }

    return student.id;
  }, [user, supabase]);

  // Fetch applications data
  const fetchApplications = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const studentId = await fetchStudentId();
      if (!studentId) {
        throw new Error('Unable to find student profile');
      }

      // Fetch all applications with company details
      const { data: submissions, error: submissionsError } = await supabase
        .from('candidate_submissions')
        .select(`
          id,
          status,
          sent_date,
          company_notes,
          requirement_id,
          interview_scheduled_date,
          companies (
            id,
            company_name,
            logo_url
          )
        `)
        .eq('student_id', studentId)
        .order('sent_date', { ascending: false });

      if (submissionsError) {
        console.error('Supabase error:', submissionsError);
        throw new Error(`Unable to load applications: ${submissionsError.message}`);
      }

      // Get submission IDs for interview_scheduled to fetch meeting links
      const interviewSubmissions = (submissions ?? [])
        .filter((sub: { status: string }) => sub.status === 'interview_scheduled');

      // Fetch calendar events for scheduled interviews using student_id and company_id
      let calendarEventsMap: Record<string, string | null> = {};
      if (interviewSubmissions.length > 0 && studentId) {
        const { data: calendarEvents } = await supabase
          .from('calendar_events')
          .select('company_id, meeting_link')
          .eq('student_id', studentId)
          .eq('event_type', 'student_interview');
        
        // Create a map of company_id -> meeting_link
        (calendarEvents ?? []).forEach((event: { company_id: string; meeting_link: string | null }) => {
          calendarEventsMap[event.company_id] = event.meeting_link;
        });
      }

      // Get unique requirement IDs to fetch position titles (batch query)
      const requirementIds = [...new Set(
        (submissions ?? [])
          .map((sub: { requirement_id: string | null }) => sub.requirement_id)
          .filter(Boolean)
      )] as string[];

      // Fetch position titles for requirements
      let requirementsMap: Record<string, string | null> = {};
      if (requirementIds.length > 0) {
        const { data: requirements } = await supabase
          .from('company_requirements')
          .select('id, position_title')
          .in('id', requirementIds);
        
        (requirements ?? []).forEach((req: { id: string; position_title: string | null }) => {
          requirementsMap[req.id] = req.position_title;
        });
      }

      // Transform data
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const transformedApplications: Application[] = (submissions ?? []).map((sub: any) => {
        // Handle Supabase join results (can be array or single object)
        const company = Array.isArray(sub.companies) ? sub.companies[0] : sub.companies;
        const companyId = company?.id ?? '';

        return {
          id: sub.id,
          status: sub.status as ApplicationStatus,
          sent_date: sub.sent_date,
          company_notes: sub.company_notes,
          interview_date: sub.interview_scheduled_date,
          meeting_link: companyId ? calendarEventsMap[companyId] ?? null : null,
          company: {
            id: companyId,
            company_name: company?.company_name ?? 'Unknown Company',
            logo_url: company?.logo_url ?? null,
          },
          position_title: sub.requirement_id ? requirementsMap[sub.requirement_id] ?? null : null,
        };
      });

      setApplications(transformedApplications);

      // Calculate status counts
      const counts: StatusCounts = {
        all: transformedApplications.length,
        sent: transformedApplications.filter(a => a.status === 'sent').length,
        company_interested: transformedApplications.filter(a => a.status === 'company_interested').length,
        interview_scheduled: transformedApplications.filter(a => a.status === 'interview_scheduled').length,
        rejected: transformedApplications.filter(a => a.status === 'rejected').length,
      };
      setStatusCounts(counts);

    } catch (err) {
      console.error('Error fetching applications:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [fetchStudentId, supabase]);

  // Initial fetch
  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  // Filter applications based on active tab
  const filteredApplications = activeTab === 'all'
    ? applications
    : applications.filter(app => app.status === activeTab);

  // Handle tab change - update URL
  const handleTabChange = (tabId: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (tabId === 'all') {
      params.delete('status');
    } else {
      params.set('status', tabId);
    }
    router.push(`/students/applications?${params.toString()}`);
  };

  // Format date helper
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  // Format interview date with time
  const formatInterviewDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  // Calculate countdown to interview
  const getInterviewCountdown = (dateString: string): string => {
    const now = new Date();
    const interview = new Date(dateString);
    const diff = interview.getTime() - now.getTime();

    if (diff < 0) return 'Past';

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h`;
    return 'Soon';
  };

  // Error state
  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.errorContainer}>
          <span className={styles.errorIcon}>⚠️</span>
          <h2>Unable to Load Applications</h2>
          <p>{error}</p>
          <button onClick={fetchApplications} className={styles.retryButton}>
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
        <h1 className={styles.title}>My Applications</h1>
        <p className={styles.subtitle}>Track where your profile has been sent</p>
      </header>

      {/* Filter Tabs */}
      <nav className={styles.tabsContainer}>
        <div className={styles.tabs}>
          {TABS.map((tab) => (
            <button
              key={tab.id}
              className={`${styles.tab} ${activeTab === tab.id ? styles.tabActive : ''}`}
              onClick={() => handleTabChange(tab.id)}
            >
              <span className={styles.tabIcon}>{tab.icon}</span>
              <span className={styles.tabLabel}>{tab.label}</span>
              <span className={styles.tabCount}>
                {statusCounts[tab.id as keyof StatusCounts]}
              </span>
            </button>
          ))}
        </div>
      </nav>

      {/* Loading State */}
      {loading ? (
        <div className={styles.loadingContainer}>
          <div className={styles.spinner}></div>
          <p className={styles.loadingText}>Loading applications...</p>
        </div>
      ) : (
        <>
          {/* Applications List */}
          {filteredApplications.length === 0 ? (
            <div className={styles.emptyState}>
              <span className={styles.emptyIcon}>
                {TABS.find(t => t.id === activeTab)?.icon || '📋'}
              </span>
              <h2>No applications {activeTab !== 'all' ? `with "${TABS.find(t => t.id === activeTab)?.label}" status` : ''} yet</h2>
              <p>
                {activeTab === 'all'
                  ? "Your profile hasn't been sent to any companies yet. Keep your profile updated and check back soon!"
                  : `You don't have any applications with this status. Check the "All" tab to see all your applications.`}
              </p>
            </div>
          ) : (
            <div className={styles.applicationsList}>
              {filteredApplications.map((application) => (
                <ApplicationCard
                  key={application.id}
                  application={application}
                  formatDate={formatDate}
                  formatInterviewDate={formatInterviewDate}
                  getInterviewCountdown={getInterviewCountdown}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// Application Card Component
interface ApplicationCardProps {
  application: Application;
  formatDate: (date: string) => string;
  formatInterviewDate: (date: string) => string;
  getInterviewCountdown: (date: string) => string;
}

function ApplicationCard({ 
  application, 
  formatDate, 
  formatInterviewDate, 
  getInterviewCountdown 
}: ApplicationCardProps) {
  const statusConfig = STATUS_CONFIG[application.status];
  const hasInterview = application.status === 'interview_scheduled' && application.interview_date;

  return (
    <article className={`${styles.applicationCard} ${styles[statusConfig.colorClass]}`}>
      <div className={styles.cardContent}>
        {/* Company Info */}
        <div className={styles.companyInfo}>
          <div className={styles.companyLogo}>
            {application.company.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={application.company.logo_url}
                alt={`${application.company.company_name} logo`}
                className={styles.logoImage}
              />
            ) : (
              <span className={styles.logoPlaceholder}>
                {application.company.company_name.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <div className={styles.companyDetails}>
            <h3 className={styles.companyName}>{application.company.company_name}</h3>
            {application.position_title && (
              <p className={styles.positionTitle}>{application.position_title}</p>
            )}
          </div>
        </div>

        {/* Status Badge */}
        <div className={`${styles.statusBadge} ${styles[statusConfig.colorClass]}`}>
          <span>{statusConfig.icon}</span>
          <span>{statusConfig.label}</span>
        </div>

        {/* Application Details */}
        <div className={styles.applicationDetails}>
          <div className={styles.detailItem}>
            <span className={styles.detailLabel}>Sent</span>
            <span className={styles.detailValue}>{formatDate(application.sent_date)}</span>
          </div>

          {/* Company Notes */}
          {application.company_notes && (
            <div className={styles.notesSection}>
              <span className={styles.detailLabel}>Company Notes</span>
              <p className={styles.notesText}>{application.company_notes}</p>
            </div>
          )}
        </div>

        {/* Interview Details (for interview_scheduled status) */}
        {hasInterview && (
          <div className={styles.interviewSection}>
            <div className={styles.interviewHeader}>
              <span className={styles.interviewIcon}>📅</span>
              <span className={styles.interviewTitle}>Interview Scheduled</span>
            </div>
            <div className={styles.interviewDetails}>
              <div className={styles.interviewDateTime}>
                <span className={styles.interviewDate}>
                  {formatInterviewDate(application.interview_date!)}
                </span>
                <span className={styles.interviewCountdown}>
                  {getInterviewCountdown(application.interview_date!)}
                </span>
              </div>
              {application.meeting_link ? (
                <a
                  href={application.meeting_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.meetingButton}
                >
                  <span>🔗</span>
                  Join Meeting
                </a>
              ) : (
                <span className={styles.noMeetingLink}>
                  Meeting link will be provided soon
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </article>
  );
}

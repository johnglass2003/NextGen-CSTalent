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
interface Company {
  id: string;
  company_name: string;
  subscription_tier: 'starter' | 'growth' | 'enterprise';
  candidates_sent_this_month: number;
  max_candidates_per_month: number;
}

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
  status: string;
  sentDate: string;
  positionTitle: string | null;
  score: number | null;
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
          interview_scheduled_date,
          requirement_id,
          students (
            id,
            first_name,
            last_name,
            overall_score
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

      // Get recent candidates (last 5)
      const recent: RecentCandidate[] = activeSubmissions.slice(0, 5).map((sub: {
        id: string;
        status: string;
        sent_date: string;
        requirement_id: string | null;
        students: { first_name: string; last_name: string; overall_score: number | null } | { first_name: string; last_name: string; overall_score: number | null }[];
      }) => {
        const student = Array.isArray(sub.students) ? sub.students[0] : sub.students;
        return {
          id: sub.id,
          studentName: student ? `${student.first_name} ${student.last_name}` : 'Unknown',
          status: sub.status,
          sentDate: sub.sent_date,
          positionTitle: sub.requirement_id ? requirementsMap[sub.requirement_id] || null : null,
          score: student?.overall_score ?? null,
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
                    className={`${styles.actionCard} ${styles[`action${action.color.charAt(0).toUpperCase() + action.color.slice(1)}`]}`}
                  >
                    <span className={styles.actionIcon}>{action.icon}</span>
                    <div className={styles.actionContent}>
                      <span className={styles.actionLabel}>{action.label}</span>
                      <span className={styles.actionDescription}>{action.description}</span>
                    </div>
                    <span className={styles.actionArrow}>→</span>
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
                      onClick={() => router.push('/companies/candidates')}
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
                        <span className={`${styles.recentStatus} ${styles[`status${candidate.status.charAt(0).toUpperCase() + candidate.status.slice(1).replace('_', '')}`]}`}>
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
    </div>
  );
}

/**
 * Student Dashboard Page
 * Main dashboard for students showing vetting status, stats, and recent activity
 */

'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import { VettingStatusDisplay, StatCard, ActivityItem } from '@/components/students/dashboard';
import type { 
  DashboardData, 
  StudentDashboardData, 
  DashboardStats, 
  ActivityItem as ActivityItemType,
  InterviewFeedback,
  VettingStatus 
} from '@/types/dashboard';
import styles from './page.module.css';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export default function StudentDashboardPage() {
  return (
    <ProtectedRoute allowedRoles={['student']}>
      <StudentDashboard />
    </ProtectedRoute>
  );
}

function StudentDashboard() {
  const { user } = useAuth();
  const [supabase] = useState(() => createClient(supabaseUrl, supabaseAnonKey));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dashboardData, setDashboardData] = useState<DashboardData>({
    student: null,
    stats: {
      companiesInterestedIn: 0,
      profilesSent: 0,
      interviewsScheduled: 0,
    },
    recentActivity: [],
    feedback: null,
  });

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Use user from AuthContext (works with dev mode)
        if (!user) {
          throw new Error('Unable to get user information');
        }

        // Get student data
        const { data: student, error: studentError } = await supabase
          .from('students')
          .select('id, first_name, vetting_status, interview_date, overall_score, feedback')
          .eq('auth_user_id', user.id)
          .single();

        if (studentError) {
          throw new Error('Unable to load student profile');
        }

        const studentData: StudentDashboardData = {
          firstName: student.first_name,
          vettingStatus: student.vetting_status as VettingStatus,
          interviewDate: student.interview_date,
          overallScore: student.overall_score,
          feedback: student.feedback,
        };

        // Get company interests count
        const { count: companiesCount, error: companiesError } = await supabase
          .from('student_company_interests')
          .select('*', { count: 'exact', head: true })
          .eq('student_id', student.id);

        // Get profiles sent count
        const { count: profilesSentCount, error: profilesError } = await supabase
          .from('candidate_submissions')
          .select('*', { count: 'exact', head: true })
          .eq('student_id', student.id);

        // Get scheduled interviews count
        const { count: interviewsCount, error: interviewsError } = await supabase
          .from('candidate_submissions')
          .select('*', { count: 'exact', head: true })
          .eq('student_id', student.id)
          .eq('status', 'interview_scheduled');

        const stats: DashboardStats = {
          companiesInterestedIn: companiesCount ?? 0,
          profilesSent: profilesSentCount ?? 0,
          interviewsScheduled: interviewsCount ?? 0,
        };

        // Get recent activity (last 5 submissions)
        const { data: submissions, error: submissionsError } = await supabase
          .from('candidate_submissions')
          .select(`
            id,
            status,
            sent_date,
            updated_at,
            companies (company_name)
          `)
          .eq('student_id', student.id)
          .order('updated_at', { ascending: false })
          .limit(5);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const recentActivity: ActivityItemType[] = (submissions ?? []).map((submission: any) => {
          let activityType: ActivityItemType['type'] = 'profile_sent';
          
          if (submission.status === 'interview_scheduled') {
            activityType = 'interview_scheduled';
          } else if (submission.status === 'interested') {
            activityType = 'interested';
          } else if (submission.status !== 'sent') {
            activityType = 'status_update';
          }

          // Handle both single object and array from Supabase join
          const companyName = Array.isArray(submission.companies)
            ? submission.companies[0]?.company_name
            : submission.companies?.company_name;

          return {
            id: submission.id,
            type: activityType,
            companyName: companyName ?? 'Unknown Company',
            date: submission.updated_at ?? submission.sent_date,
            status: submission.status,
          };
        });

        // Get interview assessment feedback if exists
        const { data: assessment, error: assessmentError } = await supabase
          .from('interview_assessments')
          .select('strengths, areas_for_improvement')
          .eq('student_id', student.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        const feedback: InterviewFeedback | null = assessment ? {
          strengths: assessment.strengths,
          areasForImprovement: assessment.areas_for_improvement,
        } : null;

        setDashboardData({
          student: studentData,
          stats,
          recentActivity,
          feedback,
        });

      } catch (err) {
        console.error('Dashboard fetch error:', err);
        setError(err instanceof Error ? err.message : 'Error loading dashboard');
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchDashboardData();
    }
  }, [supabase, user]);

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}></div>
        <p className={styles.loadingText}>Loading your dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.errorContainer}>
        <span className={styles.errorIcon}>⚠️</span>
        <h2 className={styles.errorTitle}>Error Loading Dashboard</h2>
        <p className={styles.errorMessage}>{error}</p>
        <button 
          className={styles.retryButton}
          onClick={() => window.location.reload()}
        >
          Try Again
        </button>
      </div>
    );
  }

  const { student, stats, recentActivity, feedback } = dashboardData;

  if (!student) {
    return (
      <div className={styles.errorContainer}>
        <span className={styles.errorIcon}>👤</span>
        <h2 className={styles.errorTitle}>Profile Not Found</h2>
        <p className={styles.errorMessage}>
          We couldn&apos;t find your student profile. Please complete your registration.
        </p>
      </div>
    );
  }

  return (
    <div className={styles.dashboardContainer}>
      {/* Header */}
      <header className={styles.header}>
        <h1 className={styles.welcomeTitle}>
          Welcome back, {student.firstName}!
        </h1>
      </header>

      {/* Vetting Status Card */}
      <section className={styles.statusSection}>
        <VettingStatusDisplay
          status={student.vettingStatus}
          interviewDate={student.interviewDate}
          overallScore={student.overallScore}
          feedback={student.feedback}
        />
      </section>

      {/* Stats Row */}
      <section className={styles.statsSection}>
        <h2 className={styles.sectionTitle}>Your Stats</h2>
        <div className={styles.statsGrid}>
          <StatCard
            title="Companies Interested In"
            value={stats.companiesInterestedIn}
            icon="🏢"
          />
          <StatCard
            title="Profile Sent To"
            value={stats.profilesSent}
            icon="📤"
          />
          <StatCard
            title="Interviews Scheduled"
            value={stats.interviewsScheduled}
            icon="📅"
          />
        </div>
      </section>

      {/* Recent Activity */}
      <section className={styles.activitySection}>
        <h2 className={styles.sectionTitle}>Recent Activity</h2>
        <div className={styles.activityCard}>
          {recentActivity.length > 0 ? (
            <div className={styles.activityList}>
              {recentActivity.map((activity) => (
                <ActivityItem key={activity.id} activity={activity} />
              ))}
            </div>
          ) : (
            <div className={styles.emptyState}>
              <span className={styles.emptyIcon}>📭</span>
              <p className={styles.emptyText}>
                No activity yet. Complete your profile to get started!
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Feedback Section (conditional) */}
      {feedback && (feedback.strengths || feedback.areasForImprovement) && (
        <section className={styles.feedbackSection}>
          <h2 className={styles.sectionTitle}>Your Interview Feedback</h2>
          <div className={styles.feedbackGrid}>
            {feedback.strengths && (
              <div className={styles.feedbackCard}>
                <h3 className={styles.feedbackTitle}>
                  <span className={styles.feedbackIcon}>✅</span>
                  Strengths
                </h3>
                <p className={styles.feedbackContent}>{feedback.strengths}</p>
              </div>
            )}
            {feedback.areasForImprovement && (
              <div className={styles.feedbackCard}>
                <h3 className={styles.feedbackTitle}>
                  <span className={styles.feedbackIcon}>📈</span>
                  Areas for Improvement
                </h3>
                <p className={styles.feedbackContent}>{feedback.areasForImprovement}</p>
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}

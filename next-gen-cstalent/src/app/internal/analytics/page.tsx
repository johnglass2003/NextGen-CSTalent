'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import styles from './page.module.css';

// =============================================================================
// Types
// =============================================================================

interface Analytics {
  // Students
  totalStudents: number;
  studentsByStatus: Record<string, number>;
  avgGPA: number;
  // Companies
  totalCompanies: number;
  activeCompanies: number;
  companiesByTier: Record<string, number>;
  mrr: number;
  // Submissions
  totalSubmissions: number;
  submissionsByStatus: Record<string, number>;
  totalHires: number;
  hireRate: number;
  // Requirements
  totalJobPostings: number;
  activeJobPostings: number;
}

interface TrendData {
  label: string;
  students: number;
  companies: number;
  submissions: number;
}

const TIER_PRICING: Record<string, number> = {
  starter: 500,
  growth: 1500,
  enterprise: 5000,
};

// =============================================================================
// Main Component
// =============================================================================

export default function AnalyticsPage() {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [trends, setTrends] = useState<TrendData[]>([]);
  const [topSkills, setTopSkills] = useState<{ skill: string; count: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  async function fetchAnalytics() {
    setLoading(true);

    // Fetch all data in parallel
    const [
      studentsResult,
      companiesResult,
      submissionsResult,
      requirementsResult,
    ] = await Promise.all([
      supabase.from('students').select('vetting_status, gpa, skills'),
      supabase.from('companies').select('is_active, subscription_tier'),
      supabase.from('candidate_submissions').select('status, created_at'),
      supabase.from('company_requirements').select('is_active'),
    ]);

    const students = studentsResult.data || [];
    const companies = companiesResult.data || [];
    const submissions = submissionsResult.data || [];
    const requirements = requirementsResult.data || [];

    // Calculate student metrics
    const studentsByStatus: Record<string, number> = {};
    let totalGPA = 0;
    let gpaCount = 0;
    const skillCounts: Record<string, number> = {};

    students.forEach((s) => {
      studentsByStatus[s.vetting_status || 'unknown'] = (studentsByStatus[s.vetting_status || 'unknown'] || 0) + 1;
      if (s.gpa) {
        totalGPA += s.gpa;
        gpaCount++;
      }
      (s.skills || []).forEach((skill: string) => {
        skillCounts[skill] = (skillCounts[skill] || 0) + 1;
      });
    });

    // Top 10 skills
    const sortedSkills = Object.entries(skillCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([skill, count]) => ({ skill, count }));
    setTopSkills(sortedSkills);

    // Calculate company metrics
    const activeCompanies = companies.filter((c) => c.is_active).length;
    const companiesByTier: Record<string, number> = {};
    let mrr = 0;

    companies.forEach((c) => {
      companiesByTier[c.subscription_tier || 'unknown'] = (companiesByTier[c.subscription_tier || 'unknown'] || 0) + 1;
      if (c.is_active) {
        mrr += TIER_PRICING[c.subscription_tier] || 0;
      }
    });

    // Calculate submission metrics
    const submissionsByStatus: Record<string, number> = {};
    submissions.forEach((s) => {
      submissionsByStatus[s.status || 'unknown'] = (submissionsByStatus[s.status || 'unknown'] || 0) + 1;
    });
    const totalHires = submissionsByStatus['hired'] || 0;
    const hireRate = submissions.length > 0 ? (totalHires / submissions.length) * 100 : 0;

    // Calculate 6-month trends
    const monthlyData: Record<string, TrendData> = {};
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthlyData[key] = {
        label: d.toLocaleDateString('en-US', { month: 'short' }),
        students: 0,
        companies: 0,
        submissions: 0,
      };
    }

    // Note: Would need created_at fields to calculate trends accurately
    // For now, we'll show the structure
    setTrends(Object.values(monthlyData));

    setAnalytics({
      totalStudents: students.length,
      studentsByStatus,
      avgGPA: gpaCount > 0 ? totalGPA / gpaCount : 0,
      totalCompanies: companies.length,
      activeCompanies,
      companiesByTier,
      mrr,
      totalSubmissions: submissions.length,
      submissionsByStatus,
      totalHires,
      hireRate,
      totalJobPostings: requirements.length,
      activeJobPostings: requirements.filter((r) => r.is_active).length,
    });

    setLoading(false);
  }

  if (loading) {
    return (
      <ProtectedRoute allowedRoles={['internal']}>
        <div className={styles.container}>
          <div className={styles.loading}>Loading analytics...</div>
        </div>
      </ProtectedRoute>
    );
  }

  if (!analytics) return null;

  return (
    <ProtectedRoute allowedRoles={['internal']}>
      <div className={styles.container}>
        <header className={styles.header}>
          <h1>Analytics</h1>
          <p className={styles.subtitle}>Platform performance overview</p>
        </header>

        {/* Key Metrics */}
        <section className={styles.section}>
          <h2>Key Metrics</h2>
          <div className={styles.metricsGrid}>
            <MetricCard
              icon="💰"
              label="Monthly Revenue"
              value={`$${analytics.mrr.toLocaleString()}`}
              subtitle="MRR from active companies"
              color="green"
            />
            <MetricCard
              icon="👥"
              label="Total Students"
              value={analytics.totalStudents}
              subtitle={`${analytics.studentsByStatus['vetted'] || 0} vetted`}
              color="blue"
            />
            <MetricCard
              icon="🏢"
              label="Active Companies"
              value={analytics.activeCompanies}
              subtitle={`of ${analytics.totalCompanies} total`}
              color="purple"
            />
            <MetricCard
              icon="✅"
              label="Total Hires"
              value={analytics.totalHires}
              subtitle={`${analytics.hireRate.toFixed(1)}% hire rate`}
              color="orange"
            />
          </div>
        </section>

        {/* Pipeline Funnel */}
        <section className={styles.section}>
          <h2>Student Pipeline</h2>
          <div className={styles.funnel}>
            <FunnelStep
              label="Pending Review"
              count={analytics.studentsByStatus['pending_review'] || 0}
              total={analytics.totalStudents}
              color="#f59e0b"
            />
            <FunnelStep
              label="Interviewed"
              count={analytics.studentsByStatus['interviewed'] || 0}
              total={analytics.totalStudents}
              color="#3b82f6"
            />
            <FunnelStep
              label="Vetted"
              count={analytics.studentsByStatus['vetted'] || 0}
              total={analytics.totalStudents}
              color="#22c55e"
            />
            <FunnelStep
              label="Not Accepted"
              count={analytics.studentsByStatus['not_accepted'] || 0}
              total={analytics.totalStudents}
              color="#ef4444"
            />
          </div>
        </section>

        {/* Submission Pipeline */}
        <section className={styles.section}>
          <h2>Submission Pipeline</h2>
          <div className={styles.funnel}>
            <FunnelStep
              label="Sent"
              count={analytics.submissionsByStatus['sent'] || 0}
              total={analytics.totalSubmissions}
              color="#6b7280"
            />
            <FunnelStep
              label="Company Interested"
              count={analytics.submissionsByStatus['company_interested'] || 0}
              total={analytics.totalSubmissions}
              color="#3b82f6"
            />
            <FunnelStep
              label="Interview Scheduled"
              count={analytics.submissionsByStatus['interview_scheduled'] || 0}
              total={analytics.totalSubmissions}
              color="#f59e0b"
            />
            <FunnelStep
              label="Hired"
              count={analytics.submissionsByStatus['hired'] || 0}
              total={analytics.totalSubmissions}
              color="#22c55e"
            />
          </div>
        </section>

        <div className={styles.twoColumn}>
          {/* Company Breakdown */}
          <section className={styles.section}>
            <h2>Companies by Tier</h2>
            <div className={styles.breakdown}>
              <BreakdownItem
                label="Starter"
                count={analytics.companiesByTier['starter'] || 0}
                total={analytics.totalCompanies}
                color="#fef3c7"
              />
              <BreakdownItem
                label="Growth"
                count={analytics.companiesByTier['growth'] || 0}
                total={analytics.totalCompanies}
                color="#dbeafe"
              />
              <BreakdownItem
                label="Enterprise"
                count={analytics.companiesByTier['enterprise'] || 0}
                total={analytics.totalCompanies}
                color="#f3e8ff"
              />
            </div>
          </section>

          {/* Top Skills */}
          <section className={styles.section}>
            <h2>Top Skills</h2>
            <div className={styles.skillsList}>
              {topSkills.map(({ skill, count }) => (
                <div key={skill} className={styles.skillItem}>
                  <span className={styles.skillName}>{skill}</span>
                  <span className={styles.skillCount}>{count}</span>
                </div>
              ))}
              {topSkills.length === 0 && (
                <p className={styles.emptyText}>No skills data</p>
              )}
            </div>
          </section>
        </div>

        {/* Job Postings */}
        <section className={styles.section}>
          <h2>Job Postings</h2>
          <div className={styles.statRow}>
            <div className={styles.stat}>
              <span className={styles.statValue}>{analytics.activeJobPostings}</span>
              <span className={styles.statLabel}>Active</span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statValue}>{analytics.totalJobPostings - analytics.activeJobPostings}</span>
              <span className={styles.statLabel}>Inactive</span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statValue}>{analytics.totalJobPostings}</span>
              <span className={styles.statLabel}>Total</span>
            </div>
          </div>
        </section>

        {/* Summary Stats */}
        <section className={styles.section}>
          <h2>Quick Stats</h2>
          <div className={styles.quickStats}>
            <QuickStat label="Avg GPA" value={analytics.avgGPA.toFixed(2)} />
            <QuickStat label="Total Submissions" value={analytics.totalSubmissions} />
            <QuickStat label="Conversion Rate" value={`${analytics.hireRate.toFixed(1)}%`} />
            <QuickStat label="Candidates/Company" value={(analytics.totalSubmissions / Math.max(analytics.activeCompanies, 1)).toFixed(1)} />
          </div>
        </section>
      </div>
    </ProtectedRoute>
  );
}

// =============================================================================
// Sub Components
// =============================================================================

function MetricCard({ icon, label, value, subtitle, color }: {
  icon: string;
  label: string;
  value: string | number;
  subtitle: string;
  color: 'green' | 'blue' | 'purple' | 'orange';
}) {
  return (
    <div className={`${styles.metricCard} ${styles[color]}`}>
      <span className={styles.metricIcon}>{icon}</span>
      <div>
        <p className={styles.metricLabel}>{label}</p>
        <p className={styles.metricValue}>{value}</p>
        <p className={styles.metricSubtitle}>{subtitle}</p>
      </div>
    </div>
  );
}

function FunnelStep({ label, count, total, color }: {
  label: string;
  count: number;
  total: number;
  color: string;
}) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  return (
    <div className={styles.funnelStep}>
      <div className={styles.funnelBar}>
        <div
          className={styles.funnelFill}
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
      <div className={styles.funnelInfo}>
        <span className={styles.funnelLabel}>{label}</span>
        <span className={styles.funnelCount}>{count} ({pct.toFixed(0)}%)</span>
      </div>
    </div>
  );
}

function BreakdownItem({ label, count, total, color }: {
  label: string;
  count: number;
  total: number;
  color: string;
}) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  return (
    <div className={styles.breakdownItem}>
      <div className={styles.breakdownHeader}>
        <span className={styles.breakdownLabel}>{label}</span>
        <span className={styles.breakdownCount}>{count}</span>
      </div>
      <div className={styles.breakdownBar}>
        <div
          className={styles.breakdownFill}
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

function QuickStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className={styles.quickStat}>
      <span className={styles.quickStatValue}>{value}</span>
      <span className={styles.quickStatLabel}>{label}</span>
    </div>
  );
}

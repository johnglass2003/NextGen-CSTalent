/**
 * Internal Dashboard Page
 * Main dashboard for internal team with metrics and calendar
 */

'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { InternalCalendar } from '@/components/internal';
import styles from './page.module.css';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Pricing map for MRR calculation
const PRICING_MAP: Record<string, number> = {
  starter: 500,
  growth: 1500,
  enterprise: 5000,
};

interface DashboardMetrics {
  totalStudents: number;
  vettedStudents: number;
  pendingStudents: number;
  activeCompanies: number;
  totalCompanies: number;
  upcomingEvents: number;
  mrr: number;
}

export default function InternalDashboardPage() {
  return (
    <ProtectedRoute allowedRoles={['internal']}>
      <InternalDashboard />
    </ProtectedRoute>
  );
}

function InternalDashboard() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  async function fetchDashboardData() {
    setLoading(true);
    setError(null);

    try {
      // Fetch all counts in parallel
      const [
        totalStudentsResult,
        vettedStudentsResult,
        pendingStudentsResult,
        activeCompaniesResult,
        totalCompaniesResult,
        upcomingEventsResult,
        companiesForMRRResult,
      ] = await Promise.all([
        // Total students
        supabase.from('students').select('*', { count: 'exact', head: true }),
        // Vetted students
        supabase
          .from('students')
          .select('*', { count: 'exact', head: true })
          .eq('vetting_status', 'vetted'),
        // Pending students
        supabase
          .from('students')
          .select('*', { count: 'exact', head: true })
          .eq('vetting_status', 'pending_review'),
        // Active companies
        supabase
          .from('companies')
          .select('*', { count: 'exact', head: true })
          .eq('is_active', true),
        // Total companies
        supabase.from('companies').select('*', { count: 'exact', head: true }),
        // Upcoming events (next 7 days)
        supabase
          .from('calendar_events')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'scheduled')
          .gte('start_time', new Date().toISOString())
          .lte('start_time', new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()),
        // Companies for MRR calculation
        supabase
          .from('companies')
          .select('subscription_tier')
          .eq('is_active', true),
      ]);

      // Calculate MRR
      const mrr =
        companiesForMRRResult.data?.reduce((sum, company) => {
          const tier = company.subscription_tier?.toLowerCase() || '';
          return sum + (PRICING_MAP[tier] || 0);
        }, 0) || 0;

      setMetrics({
        totalStudents: totalStudentsResult.count || 0,
        vettedStudents: vettedStudentsResult.count || 0,
        pendingStudents: pendingStudentsResult.count || 0,
        activeCompanies: activeCompaniesResult.count || 0,
        totalCompanies: totalCompaniesResult.count || 0,
        upcomingEvents: upcomingEventsResult.count || 0,
        mrr,
      });
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className={styles.dashboardContainer}>
      <header className={styles.header}>
        <h1 className={styles.title}>Internal Dashboard</h1>
        <p className={styles.subtitle}>
          Overview of NextGen CS Talent operations
        </p>
      </header>

      {/* Metrics Grid */}
      <section className={styles.metricsSection}>
        {loading ? (
          <div className={styles.metricsGrid}>
            {[...Array(4)].map((_, i) => (
              <div key={i} className={`${styles.metricCard} ${styles.loading}`}>
                <div className={styles.skeletonTitle}></div>
                <div className={styles.skeletonValue}></div>
                <div className={styles.skeletonSubtitle}></div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className={styles.errorMessage}>
            {error}
            <button onClick={fetchDashboardData} className={styles.retryButton}>
              Retry
            </button>
          </div>
        ) : metrics ? (
          <div className={styles.metricsGrid}>
            {/* Revenue Card */}
            <div className={`${styles.metricCard} ${styles.revenueCard}`}>
              <div className={styles.metricIcon}>
                <DollarIcon />
              </div>
              <div className={styles.metricContent}>
                <h3 className={styles.metricTitle}>Monthly Revenue</h3>
                <p className={styles.metricValue}>{formatCurrency(metrics.mrr)}</p>
                <p className={styles.metricSubtitle}>MRR from active companies</p>
              </div>
            </div>

            {/* Students Card */}
            <div className={`${styles.metricCard} ${styles.studentsCard}`}>
              <div className={styles.metricIcon}>
                <UsersIcon />
              </div>
              <div className={styles.metricContent}>
                <h3 className={styles.metricTitle}>Total Students</h3>
                <p className={styles.metricValue}>{metrics.totalStudents}</p>
                <p className={styles.metricSubtitle}>
                  {metrics.vettedStudents} vetted, {metrics.pendingStudents} pending
                </p>
              </div>
            </div>

            {/* Companies Card */}
            <div className={`${styles.metricCard} ${styles.companiesCard}`}>
              <div className={styles.metricIcon}>
                <BuildingIcon />
              </div>
              <div className={styles.metricContent}>
                <h3 className={styles.metricTitle}>Active Companies</h3>
                <p className={styles.metricValue}>{metrics.activeCompanies}</p>
                <p className={styles.metricSubtitle}>
                  {metrics.totalCompanies} total companies
                </p>
              </div>
            </div>

            {/* Events Card */}
            <div className={`${styles.metricCard} ${styles.eventsCard}`}>
              <div className={styles.metricIcon}>
                <CalendarIcon />
              </div>
              <div className={styles.metricContent}>
                <h3 className={styles.metricTitle}>Upcoming Events</h3>
                <p className={styles.metricValue}>{metrics.upcomingEvents}</p>
                <p className={styles.metricSubtitle}>Next 7 days</p>
              </div>
            </div>
          </div>
        ) : null}
      </section>

      {/* Calendar Section */}
      <section className={styles.calendarSection}>
        <h2 className={styles.sectionTitle}>Calendar</h2>
        <div className={styles.calendarWrapper}>
          <InternalCalendar />
        </div>
      </section>
    </div>
  );
}

// Icon Components
function DollarIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="12" y1="1" x2="12" y2="23"></line>
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
      <circle cx="9" cy="7" r="4"></circle>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
      <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
    </svg>
  );
}

function BuildingIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="4" y="2" width="16" height="20" rx="2" ry="2"></rect>
      <path d="M9 22v-4h6v4"></path>
      <path d="M8 6h.01"></path>
      <path d="M16 6h.01"></path>
      <path d="M12 6h.01"></path>
      <path d="M12 10h.01"></path>
      <path d="M12 14h.01"></path>
      <path d="M16 10h.01"></path>
      <path d="M16 14h.01"></path>
      <path d="M8 10h.01"></path>
      <path d="M8 14h.01"></path>
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
      <line x1="16" y1="2" x2="16" y2="6"></line>
      <line x1="8" y1="2" x2="8" y2="6"></line>
      <line x1="3" y1="10" x2="21" y2="10"></line>
    </svg>
  );
}

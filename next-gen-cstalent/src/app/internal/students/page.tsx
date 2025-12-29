/**
 * Internal Student Management Page
 * View and filter all students in the system
 */

'use client';

import { useState, useEffect, useCallback, useMemo, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { AddStudentModal } from '@/components/students/AddStudentModal';
import styles from './page.module.css';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Vetting status options
const VETTING_STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'pending_review', label: 'Pending Review' },
  { value: 'interview_scheduled', label: 'Interview Scheduled' },
  { value: 'vetted', label: 'Vetted' },
  { value: 'not_accepted', label: 'Not Accepted' },
];

// Graduation year options
const GRADUATION_YEAR_OPTIONS = [
  { value: '', label: 'All Years' },
  { value: '2025', label: '2025' },
  { value: '2026', label: '2026' },
  { value: '2027', label: '2027' },
  { value: '2028', label: '2028' },
  { value: '2029', label: '2029' },
];

// Major options
const MAJOR_OPTIONS = [
  { value: '', label: 'All Majors' },
  { value: 'Computer Science', label: 'Computer Science' },
  { value: 'Computer Engineering', label: 'Computer Engineering' },
  { value: 'Software Engineering', label: 'Software Engineering' },
  { value: 'Data Science', label: 'Data Science' },
  { value: 'Information Technology', label: 'Information Technology' },
  { value: 'Cybersecurity', label: 'Cybersecurity' },
  { value: 'Electrical Engineering', label: 'Electrical Engineering' },
  { value: 'Other', label: 'Other' },
];

// Status display config
type VettingStatus = 'pending_review' | 'interview_scheduled' | 'vetted' | 'not_accepted';

const STATUS_CONFIG: Record<VettingStatus, { label: string; colorClass: string }> = {
  pending_review: { label: 'Pending Review', colorClass: 'statusPending' },
  interview_scheduled: { label: 'Interview Scheduled', colorClass: 'statusInterview' },
  vetted: { label: 'Vetted', colorClass: 'statusVetted' },
  not_accepted: { label: 'Not Accepted', colorClass: 'statusNotAccepted' },
};

// Sortable columns
type SortColumn = 'name' | 'email' | 'major' | 'graduation_year' | 'gpa' | 'vetting_status' | 'overall_score' | 'created_at';
type SortDirection = 'asc' | 'desc';

// Student interface
interface Student {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  major: string | null;
  graduation_year: number | null;
  gpa: number | null;
  vetting_status: VettingStatus;
  overall_score: number | null;
  created_at: string;
  latest_assessment?: {
    score: number;
    date: string;
  } | null;
}

const ITEMS_PER_PAGE = 50;

export default function InternalStudentsPage() {
  return (
    <ProtectedRoute allowedRoles={['internal']}>
      <Suspense fallback={<LoadingState />}>
        <StudentManagement />
      </Suspense>
    </ProtectedRoute>
  );
}

function LoadingState() {
  return (
    <div className={styles.container}>
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}></div>
        <p className={styles.loadingText}>Loading students...</p>
      </div>
    </div>
  );
}

function StudentManagement() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [supabase] = useState(() => createClient(supabaseUrl, supabaseAnonKey));

  // State
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [showAddModal, setShowAddModal] = useState(false);

  // Filter state from URL params
  const [searchInput, setSearchInput] = useState(searchParams.get('search') || '');
  const searchQuery = searchParams.get('search') || '';
  const statusFilter = searchParams.get('status') || '';
  const yearFilter = searchParams.get('year') || '';
  const majorFilter = searchParams.get('major') || '';
  const currentPage = parseInt(searchParams.get('page') || '1', 10);
  const sortColumn = (searchParams.get('sort') || 'created_at') as SortColumn;
  const sortDirection = (searchParams.get('dir') || 'desc') as SortDirection;

  // Check if any filters are active
  const hasActiveFilters = searchQuery || statusFilter || yearFilter || majorFilter;

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

    // Reset page when filters change (unless updating page itself)
    if (!('page' in updates)) {
      params.delete('page');
    }

    router.push(`/internal/students?${params.toString()}`);
  }, [router, searchParams]);

  // Debounced search
  useEffect(() => {
    setSearching(true);
    const timer = setTimeout(() => {
      if (searchInput !== searchQuery) {
        updateParams({ search: searchInput || null });
      }
      setSearching(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchInput, searchQuery, updateParams]);

  // Fetch students
  const fetchStudents = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Build query
      let query = supabase
        .from('students')
        .select('id, first_name, last_name, email, major, graduation_year, gpa, vetting_status, overall_score, created_at', { count: 'exact' });

      // Apply search filter
      if (searchQuery) {
        query = query.or(`first_name.ilike.%${searchQuery}%,last_name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`);
      }

      // Apply status filter
      if (statusFilter) {
        query = query.eq('vetting_status', statusFilter);
      }

      // Apply year filter
      if (yearFilter) {
        query = query.eq('graduation_year', parseInt(yearFilter, 10));
      }

      // Apply major filter
      if (majorFilter) {
        query = query.eq('major', majorFilter);
      }

      // Apply sorting
      const sortField = sortColumn === 'name' ? 'first_name' : sortColumn;
      query = query.order(sortField, { ascending: sortDirection === 'asc' });

      // Apply pagination
      const from = (currentPage - 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;
      query = query.range(from, to);

      const { data, error: fetchError, count } = await query;

      if (fetchError) {
        throw new Error(fetchError.message);
      }

      // Fetch latest assessments for each student
      const studentIds = (data || []).map(s => s.id);
      let studentsWithAssessments = data || [];

      if (studentIds.length > 0) {
        const { data: assessments } = await supabase
          .from('interview_assessments')
          .select('student_id, total_score, interview_date')
          .in('student_id', studentIds)
          .order('interview_date', { ascending: false });

        // Group by student_id and get the latest
        const latestByStudent: Record<string, { score: number; date: string }> = {};
        (assessments || []).forEach(a => {
          if (!latestByStudent[a.student_id]) {
            latestByStudent[a.student_id] = { score: parseFloat(a.total_score) || 0, date: a.interview_date };
          }
        });

        // Merge with students
        studentsWithAssessments = (data || []).map(student => ({
          ...student,
          latest_assessment: latestByStudent[student.id] || null,
        }));
      }

      setStudents(studentsWithAssessments);
      setTotalCount(count || 0);
    } catch (err) {
      console.error('Error fetching students:', err);
      setError(err instanceof Error ? err.message : 'Failed to load students');
    } finally {
      setLoading(false);
    }
  }, [supabase, searchQuery, statusFilter, yearFilter, majorFilter, sortColumn, sortDirection, currentPage]);

  // Fetch on mount and when filters change
  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  // Handle sort
  const handleSort = (column: SortColumn) => {
    const newDirection = sortColumn === column && sortDirection === 'asc' ? 'desc' : 'asc';
    updateParams({ sort: column, dir: newDirection });
  };

  // Handle clear filters
  const handleClearFilters = () => {
    setSearchInput('');
    router.push('/internal/students');
  };

  // Handle page change
  const handlePageChange = (page: number) => {
    updateParams({ page: page.toString() });
  };

  // Calculate pagination
  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  // Get sort indicator
  const getSortIndicator = (column: SortColumn) => {
    if (sortColumn !== column) return null;
    return sortDirection === 'asc' ? ' ↑' : ' ↓';
  };

  // Format score with color (for assessment scores 0-100)
  const getAssessmentScoreColor = (score: number | null): string => {
    if (score === null) return styles.scoreNotAssessed;
    if (score >= 80) return styles.scoreHigh;
    if (score >= 60) return styles.scoreMedium;
    return styles.scoreLow;
  };

  // Format date to short format (e.g., "Dec 15")
  const formatShortDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // Error state
  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.errorContainer}>
          <span className={styles.errorIcon}>⚠️</span>
          <h2>Unable to Load Students</h2>
          <p>{error}</p>
          <button onClick={fetchStudents} className={styles.retryButton}>
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
        <div className={styles.headerTop}>
          <div>
            <h1 className={styles.title}>Student Management</h1>
            <p className={styles.subtitle}>
              {totalCount} student{totalCount !== 1 ? 's' : ''} total
            </p>
          </div>
          <button className={styles.addButton} onClick={() => setShowAddModal(true)}>
            + Add Student
          </button>
        </div>

        {/* Search Bar */}
        <div className={styles.searchContainer}>
          <div className={styles.searchInputWrapper}>
            <span className={styles.searchIcon}>🔍</span>
            <input
              type="text"
              placeholder="Search by name or email..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className={styles.searchInput}
            />
            {searchInput && (
              <button
                onClick={() => setSearchInput('')}
                className={styles.clearSearch}
                aria-label="Clear search"
              >
                ✕
              </button>
            )}
          </div>
          {searching && <span className={styles.searchingIndicator}>Searching...</span>}
        </div>
      </header>

      {/* Filter Bar */}
      <div className={styles.filterBar}>
        <div className={styles.filters}>
          <select
            value={statusFilter}
            onChange={(e) => updateParams({ status: e.target.value || null })}
            className={styles.filterSelect}
          >
            {VETTING_STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <select
            value={yearFilter}
            onChange={(e) => updateParams({ year: e.target.value || null })}
            className={styles.filterSelect}
          >
            {GRADUATION_YEAR_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <select
            value={majorFilter}
            onChange={(e) => updateParams({ major: e.target.value || null })}
            className={styles.filterSelect}
          >
            {MAJOR_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          {hasActiveFilters && (
            <button onClick={handleClearFilters} className={styles.clearFiltersButton}>
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className={styles.loadingContainer}>
          <div className={styles.spinner}></div>
          <p className={styles.loadingText}>Loading students...</p>
        </div>
      ) : students.length === 0 ? (
        <div className={styles.emptyState}>
          <span className={styles.emptyIcon}>👥</span>
          {hasActiveFilters ? (
            <>
              <h2>No students found</h2>
              <p>
                {searchQuery
                  ? `No results for "${searchQuery}"`
                  : 'No students match the current filters'}
              </p>
              <button onClick={handleClearFilters} className={styles.clearFiltersButton}>
                Clear Filters
              </button>
            </>
          ) : (
            <>
              <h2>No students yet</h2>
              <p>Students will appear here once they register.</p>
            </>
          )}
        </div>
      ) : (
        <>
          {/* Table */}
          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <thead className={styles.tableHead}>
                <tr>
                  <th
                    className={`${styles.th} ${styles.sortable}`}
                    onClick={() => handleSort('name')}
                  >
                    Name{getSortIndicator('name')}
                  </th>
                  <th
                    className={`${styles.th} ${styles.sortable}`}
                    onClick={() => handleSort('email')}
                  >
                    Email{getSortIndicator('email')}
                  </th>
                  <th
                    className={`${styles.th} ${styles.sortable}`}
                    onClick={() => handleSort('major')}
                  >
                    Major{getSortIndicator('major')}
                  </th>
                  <th
                    className={`${styles.th} ${styles.sortable}`}
                    onClick={() => handleSort('graduation_year')}
                  >
                    Grad Year{getSortIndicator('graduation_year')}
                  </th>
                  <th
                    className={`${styles.th} ${styles.sortable}`}
                    onClick={() => handleSort('gpa')}
                  >
                    GPA{getSortIndicator('gpa')}
                  </th>
                  <th
                    className={`${styles.th} ${styles.sortable}`}
                    onClick={() => handleSort('vetting_status')}
                  >
                    Status{getSortIndicator('vetting_status')}
                  </th>
                  <th
                    className={`${styles.th} ${styles.sortable}`}
                    onClick={() => handleSort('overall_score')}
                  >
                    Score{getSortIndicator('overall_score')}
                  </th>
                  <th className={styles.th}>Actions</th>
                </tr>
              </thead>
              <tbody className={styles.tableBody}>
                {students.map((student) => (
                  <tr key={student.id} className={styles.tr}>
                    <td className={styles.td}>
                      <span className={styles.studentName}>
                        {student.first_name} {student.last_name}
                      </span>
                    </td>
                    <td className={styles.td}>
                      <span className={styles.email}>{student.email}</span>
                    </td>
                    <td className={styles.td}>{student.major || '—'}</td>
                    <td className={styles.td}>{student.graduation_year || '—'}</td>
                    <td className={styles.td}>
                      {student.gpa ? student.gpa.toFixed(2) : '—'}
                    </td>
                    <td className={styles.td}>
                      <span className={`${styles.statusBadge} ${styles[STATUS_CONFIG[student.vetting_status]?.colorClass || '']}`}>
                        {STATUS_CONFIG[student.vetting_status]?.label || student.vetting_status}
                      </span>
                    </td>
                    <td className={styles.td}>
                      {student.latest_assessment ? (
                        <div className={styles.scoreWrapper}>
                          <span className={`${styles.score} ${getAssessmentScoreColor(student.latest_assessment.score)}`}>
                            {Math.round(student.latest_assessment.score)}/100
                          </span>
                          <span className={styles.scoreDate}>
                            {formatShortDate(student.latest_assessment.date)}
                          </span>
                        </div>
                      ) : (
                        <span className={styles.scoreNotAssessed}>Not Assessed</span>
                      )}
                    </td>
                    <td className={styles.td}>
                      <Link
                        href={`/internal/students/${student.id}`}
                        className={styles.viewButton}
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className={styles.pagination}>
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className={styles.pageButton}
              >
                ← Previous
              </button>
              <span className={styles.pageInfo}>
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className={styles.pageButton}
              >
                Next →
              </button>
            </div>
          )}
        </>
      )}

      {/* Add Student Modal */}
      <AddStudentModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={fetchStudents}
      />
    </div>
  );
}

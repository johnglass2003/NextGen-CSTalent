/**
 * Browse Companies Page
 * Students can explore partner companies and mark their interests
 */

'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import styles from './page.module.css';

interface Company {
  id: string;
  company_name: string;
  industry: string;
  description: string | null;
  logo_url: string | null;
  website_url: string | null;
}

interface JobRequirement {
  id: string;
  position_title: string;
  job_description: string | null;
  tech_stack: string[] | null;
  location_preferences: string[] | null;
  desired_graduation_dates: string[] | null;
  minimum_gpa: number | null;
  employment_type: string | null;
}

interface PositionsModalState {
  isOpen: boolean;
  company: Company | null;
  loading: boolean;
  requirements: JobRequirement[];
}

interface JobDetailModalState {
  isOpen: boolean;
  job: JobRequirement | null;
  companyName: string;
}

export default function BrowseCompaniesPage() {
  return (
    <ProtectedRoute allowedRoles={['student']}>
      <BrowseCompanies />
    </ProtectedRoute>
  );
}

function BrowseCompanies() {
  const { user } = useAuth();
  
  const [companies, setCompanies] = useState<Company[]>([]);
  const [interestedCompanyIds, setInterestedCompanyIds] = useState<Set<string>>(new Set());
  const [studentId, setStudentId] = useState<string | null>(null);
  
  // Modal states
  const [positionsModal, setPositionsModal] = useState<PositionsModalState>({
    isOpen: false,
    company: null,
    loading: false,
    requirements: [],
  });
  const [jobDetailModal, setJobDetailModal] = useState<JobDetailModalState>({
    isOpen: false,
    job: null,
    companyName: '',
  });
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Fetch companies and interests on mount
  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  // Auto-hide toast
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get student ID
      const { data: student, error: studentError } = await supabase
        .from('students')
        .select('id')
        .eq('auth_user_id', user?.id)
        .single();

      if (studentError || !student) {
        throw new Error('Unable to load student profile');
      }

      setStudentId(student.id);

      // Fetch all public, active companies
      const { data: companiesData, error: companiesError } = await supabase
        .from('companies')
        .select('id, company_name, industry, description, logo_url, website_url')
        .eq('is_public', true)
        .eq('is_active', true)
        .order('company_name');

      if (companiesError) throw companiesError;
      setCompanies(companiesData || []);

      // Fetch student's existing interests
      const { data: interests, error: interestsError } = await supabase
        .from('student_company_interests')
        .select('company_id')
        .eq('student_id', student.id);

      if (!interestsError && interests) {
        setInterestedCompanyIds(new Set(interests.map(i => i.company_id)));
      }

    } catch (err) {
      console.error('Error fetching data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load companies');
    } finally {
      setLoading(false);
    }
  };

  const openPositionsModal = async (company: Company) => {
    setPositionsModal({
      isOpen: true,
      company,
      loading: true,
      requirements: [],
    });

    try {
      // Fetch requirements for the company
      // Note: RLS policies should allow students to view active job requirements
      const { data, error, status } = await supabase
        .from('company_requirements')
        .select('id, position_title, job_description, tech_stack, location_preferences, desired_graduation_dates, minimum_gpa, employment_type')
        .eq('company_id', company.id)
        .eq('is_active', true);

      if (error) {
        console.error('Supabase error details:', { 
          message: error.message, 
          code: error.code, 
          details: error.details,
          hint: error.hint,
          status 
        });
        throw error;
      }

      setPositionsModal(prev => ({
        ...prev,
        loading: false,
        requirements: data || [],
      }));
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.error('Error fetching requirements:', errorMessage);
      setPositionsModal(prev => ({
        ...prev,
        loading: false,
        requirements: [],
      }));
      // Don't show error toast if it's just empty results due to RLS
      // The modal will show "No open positions" message instead
    }
  };

  const closePositionsModal = () => {
    setPositionsModal({
      isOpen: false,
      company: null,
      loading: false,
      requirements: [],
    });
  };

  const openJobDetailModal = (job: JobRequirement, companyName: string) => {
    setJobDetailModal({
      isOpen: true,
      job,
      companyName,
    });
  };

  const closeJobDetailModal = () => {
    setJobDetailModal({
      isOpen: false,
      job: null,
      companyName: '',
    });
  };

  const toggleInterest = async (companyId: string) => {
    if (!studentId) return;

    const isCurrentlyInterested = interestedCompanyIds.has(companyId);

    // Optimistic update
    setInterestedCompanyIds(prev => {
      const newSet = new Set(prev);
      if (isCurrentlyInterested) {
        newSet.delete(companyId);
      } else {
        newSet.add(companyId);
      }
      return newSet;
    });

    try {
      if (isCurrentlyInterested) {
        // Remove interest
        const { error } = await supabase
          .from('student_company_interests')
          .delete()
          .eq('student_id', studentId)
          .eq('company_id', companyId);

        if (error) throw error;
        setToast({ message: 'Interest removed', type: 'success' });
      } else {
        // Add interest
        const { error } = await supabase
          .from('student_company_interests')
          .insert({ student_id: studentId, company_id: companyId });

        if (error) throw error;
        setToast({ message: 'Interest saved!', type: 'success' });
      }
    } catch (err) {
      console.error('Error toggling interest:', err);
      // Revert optimistic update
      setInterestedCompanyIds(prev => {
        const newSet = new Set(prev);
        if (isCurrentlyInterested) {
          newSet.add(companyId);
        } else {
          newSet.delete(companyId);
        }
        return newSet;
      });
      setToast({ message: 'Failed to update interest', type: 'error' });
    }
  };

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}></div>
        <p>Loading companies...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.errorContainer}>
        <div className={styles.errorIcon}>⚠️</div>
        <h2>Error Loading Companies</h2>
        <p>{error}</p>
        <button onClick={fetchData} className={styles.retryButton}>
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Toast Notification */}
      {toast && (
        <div className={`${styles.toast} ${styles[toast.type]}`}>
          {toast.message}
        </div>
      )}

      {/* Page Header */}
      <header className={styles.header}>
        <h1 className={styles.title}>Browse Companies</h1>
        <p className={styles.subtitle}>
          Explore companies we work with and mark your interests
        </p>
      </header>

      {/* Companies Grid */}
      {companies.length === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>🏢</div>
          <h2>No Companies Available</h2>
          <p>Check back soon for new partner companies.</p>
        </div>
      ) : (
        <div className={styles.companiesGrid}>
          {companies.map(company => {
            const isInterested = interestedCompanyIds.has(company.id);

            return (
              <div key={company.id} className={styles.companyCard}>
                {/* Company Header */}
                <div className={styles.companyHeader}>
                  <div className={styles.companyLogo}>
                    {company.logo_url ? (
                      <img src={company.logo_url} alt={company.company_name} />
                    ) : (
                      <span className={styles.companyInitial}>
                        {company.company_name.charAt(0)}
                      </span>
                    )}
                  </div>
                  <div className={styles.companyInfo}>
                    <h3 className={styles.companyName}>{company.company_name}</h3>
                    <span className={styles.companyIndustry}>{company.industry}</span>
                  </div>
                </div>

                {/* Description */}
                {company.description && (
                  <p className={styles.companyDescription}>
                    {company.description.length > 150
                      ? `${company.description.substring(0, 150)}...`
                      : company.description}
                  </p>
                )}

                {/* Website Link */}
                {company.website_url && (
                  <a
                    href={company.website_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.websiteLink}
                  >
                    <span>🔗</span> Visit Website
                  </a>
                )}

                {/* Action Buttons */}
                <div className={styles.cardActions}>
                  <button
                    onClick={() => openPositionsModal(company)}
                    className={styles.viewPositionsBtn}
                  >
                    <span>💼</span>
                    View Open Positions
                  </button>

                  <label className={`${styles.interestCheckbox} ${isInterested ? styles.checked : ''}`}>
                    <input
                      type="checkbox"
                      checked={isInterested}
                      onChange={() => toggleInterest(company.id)}
                    />
                    <span className={styles.checkmark}>
                      {isInterested ? '✓' : ''}
                    </span>
                    I&apos;m Interested
                  </label>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Positions Modal */}
      {positionsModal.isOpen && positionsModal.company && (
        <div className={styles.modalOverlay} onClick={closePositionsModal}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div>
                <h2 className={styles.modalTitle}>
                  Open Positions at {positionsModal.company.company_name}
                </h2>
                <p className={styles.modalSubtitle}>
                  Click on a position to view full details
                </p>
              </div>
              <button onClick={closePositionsModal} className={styles.closeButton}>
                ✕
              </button>
            </div>

            <div className={styles.modalContent}>
              {positionsModal.loading ? (
                <div className={styles.modalLoading}>
                  <div className={styles.spinner}></div>
                  <p>Loading positions...</p>
                </div>
              ) : positionsModal.requirements.length === 0 ? (
                <div className={styles.modalEmpty}>
                  <span className={styles.emptyIcon}>📋</span>
                  <p>No open positions at this time.</p>
                  <span className={styles.emptyHint}>
                    Mark your interest to be notified when positions open up!
                  </span>
                </div>
              ) : (
                <div className={styles.positionsGrid}>
                  {positionsModal.requirements.map(req => (
                    <button
                      key={req.id}
                      className={styles.positionTile}
                      onClick={() => openJobDetailModal(req, positionsModal.company!.company_name)}
                    >
                      <h4 className={styles.positionTileTitle}>{req.position_title}</h4>
                      <div className={styles.positionTileMeta}>
                        {req.employment_type && (
                          <span className={styles.positionTileType}>{req.employment_type}</span>
                        )}
                        {req.location_preferences && req.location_preferences.length > 0 && (
                          <span className={styles.positionTileLocation}>
                            📍 {req.location_preferences[0]}
                            {req.location_preferences.length > 1 && ` +${req.location_preferences.length - 1}`}
                          </span>
                        )}
                      </div>
                      {req.tech_stack && req.tech_stack.length > 0 && (
                        <div className={styles.positionTileTech}>
                          {req.tech_stack.slice(0, 3).map((tech, idx) => (
                            <span key={idx} className={styles.techChip}>{tech}</span>
                          ))}
                          {req.tech_stack.length > 3 && (
                            <span className={styles.techMore}>+{req.tech_stack.length - 3}</span>
                          )}
                        </div>
                      )}
                      <span className={styles.viewDetailsHint}>Click to view details →</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Job Detail Modal */}
      {jobDetailModal.isOpen && jobDetailModal.job && (
        <div className={styles.modalOverlay} onClick={closeJobDetailModal}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div>
                <span className={styles.modalCompanyName}>{jobDetailModal.companyName}</span>
                <h2 className={styles.modalTitle}>{jobDetailModal.job.position_title}</h2>
              </div>
              <button onClick={closeJobDetailModal} className={styles.closeButton}>
                ✕
              </button>
            </div>

            <div className={styles.modalContent}>
              <div className={styles.jobDetailContent}>
                {/* Employment Type */}
                {jobDetailModal.job.employment_type && (
                  <div className={styles.jobDetailBadges}>
                    <span className={styles.employmentBadge}>
                      {jobDetailModal.job.employment_type}
                    </span>
                  </div>
                )}

                {/* Job Description */}
                {jobDetailModal.job.job_description && (
                  <div className={styles.jobDetailSection}>
                    <h3 className={styles.jobDetailSectionTitle}>About this Role</h3>
                    <p className={styles.jobDescription}>
                      {jobDetailModal.job.job_description}
                    </p>
                  </div>
                )}

                {/* Tech Stack */}
                {jobDetailModal.job.tech_stack && jobDetailModal.job.tech_stack.length > 0 && (
                  <div className={styles.jobDetailSection}>
                    <h3 className={styles.jobDetailSectionTitle}>Tech Stack</h3>
                    <div className={styles.techStackList}>
                      {jobDetailModal.job.tech_stack.map((tech, idx) => (
                        <span key={idx} className={styles.techStackItem}>{tech}</span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Requirements Grid */}
                <div className={styles.requirementsGrid}>
                  {/* Location */}
                  {jobDetailModal.job.location_preferences && jobDetailModal.job.location_preferences.length > 0 && (
                    <div className={styles.requirementItem}>
                      <span className={styles.requirementIcon}>📍</span>
                      <div>
                        <span className={styles.requirementLabel}>Location</span>
                        <span className={styles.requirementValue}>
                          {jobDetailModal.job.location_preferences.join(', ')}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Graduation Dates */}
                  {jobDetailModal.job.desired_graduation_dates && jobDetailModal.job.desired_graduation_dates.length > 0 && (
                    <div className={styles.requirementItem}>
                      <span className={styles.requirementIcon}>🎓</span>
                      <div>
                        <span className={styles.requirementLabel}>Graduation Years</span>
                        <span className={styles.requirementValue}>
                          {jobDetailModal.job.desired_graduation_dates.join(', ')}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Minimum GPA */}
                  {jobDetailModal.job.minimum_gpa && (
                    <div className={styles.requirementItem}>
                      <span className={styles.requirementIcon}>📊</span>
                      <div>
                        <span className={styles.requirementLabel}>Minimum GPA</span>
                        <span className={styles.requirementValue}>
                          {jobDetailModal.job.minimum_gpa.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Back Button */}
                <button
                  onClick={() => {
                    closeJobDetailModal();
                  }}
                  className={styles.backToPositionsBtn}
                >
                  ← Back to Positions
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

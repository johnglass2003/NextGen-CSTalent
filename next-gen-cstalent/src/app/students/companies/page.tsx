/**
 * Browse Companies Page
 * Students can explore partner companies and mark their interests
 */

'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useAuth } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import styles from './page.module.css';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

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
}

interface ExpandedCompany {
  companyId: string;
  loading: boolean;
  requirements: JobRequirement[];
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
  const [supabase] = useState(() => createClient(supabaseUrl, supabaseAnonKey));
  
  const [companies, setCompanies] = useState<Company[]>([]);
  const [interestedCompanyIds, setInterestedCompanyIds] = useState<Set<string>>(new Set());
  const [expandedCompanies, setExpandedCompanies] = useState<Map<string, ExpandedCompany>>(new Map());
  const [studentId, setStudentId] = useState<string | null>(null);
  
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

  const fetchJobRequirements = async (companyId: string) => {
    // Check if already loading or loaded
    const existing = expandedCompanies.get(companyId);
    if (existing && !existing.loading && existing.requirements.length > 0) {
      // Toggle collapse
      setExpandedCompanies(prev => {
        const newMap = new Map(prev);
        newMap.delete(companyId);
        return newMap;
      });
      return;
    }

    // Set loading state
    setExpandedCompanies(prev => {
      const newMap = new Map(prev);
      newMap.set(companyId, { companyId, loading: true, requirements: [] });
      return newMap;
    });

    try {
      // Fetch requirements (excluding internal_notes)
      const { data, error } = await supabase
        .from('company_requirements')
        .select('id, position_title, job_description, tech_stack, location_preferences, desired_graduation_dates, minimum_gpa')
        .eq('company_id', companyId)
        .eq('is_active', true);

      if (error) throw error;

      setExpandedCompanies(prev => {
        const newMap = new Map(prev);
        newMap.set(companyId, { companyId, loading: false, requirements: data || [] });
        return newMap;
      });
    } catch (err) {
      console.error('Error fetching requirements:', err);
      setExpandedCompanies(prev => {
        const newMap = new Map(prev);
        newMap.set(companyId, { companyId, loading: false, requirements: [] });
        return newMap;
      });
      setToast({ message: 'Failed to load job openings', type: 'error' });
    }
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
            const isExpanded = expandedCompanies.has(company.id);
            const expandedData = expandedCompanies.get(company.id);
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
                    onClick={() => fetchJobRequirements(company.id)}
                    className={`${styles.viewPositionsBtn} ${isExpanded ? styles.expanded : ''}`}
                  >
                    {expandedData?.loading ? (
                      'Loading...'
                    ) : (
                      <>
                        <span className={styles.expandIcon}>{isExpanded ? '▼' : '▶'}</span>
                        View Open Positions
                      </>
                    )}
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

                {/* Expanded Job Positions */}
                {isExpanded && expandedData && !expandedData.loading && (
                  <div className={styles.positionsSection}>
                    {expandedData.requirements.length === 0 ? (
                      <p className={styles.noPositions}>No open positions at this time.</p>
                    ) : (
                      <div className={styles.positionsList}>
                        {expandedData.requirements.map(req => (
                          <div key={req.id} className={styles.positionCard}>
                            <h4 className={styles.positionTitle}>{req.position_title}</h4>
                            
                            {req.job_description && (
                              <p className={styles.positionDescription}>
                                {req.job_description}
                              </p>
                            )}

                            {/* Tech Stack */}
                            {req.tech_stack && req.tech_stack.length > 0 && (
                              <div className={styles.techStack}>
                                <span className={styles.fieldLabel}>Tech Stack:</span>
                                <div className={styles.tags}>
                                  {req.tech_stack.map((tech, idx) => (
                                    <span key={idx} className={styles.tag}>{tech}</span>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Location */}
                            {req.location_preferences && req.location_preferences.length > 0 && (
                              <div className={styles.fieldRow}>
                                <span className={styles.fieldLabel}>📍 Location:</span>
                                <span>{req.location_preferences.join(', ')}</span>
                              </div>
                            )}

                            {/* Graduation Dates */}
                            {req.desired_graduation_dates && req.desired_graduation_dates.length > 0 && (
                              <div className={styles.fieldRow}>
                                <span className={styles.fieldLabel}>🎓 Grad Years:</span>
                                <span>{req.desired_graduation_dates.join(', ')}</span>
                              </div>
                            )}

                            {/* Minimum GPA */}
                            {req.minimum_gpa && (
                              <div className={styles.fieldRow}>
                                <span className={styles.fieldLabel}>📊 Min GPA:</span>
                                <span>{req.minimum_gpa.toFixed(2)}</span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/**
 * Company Job Requirements Management Page
 * Create, edit, and manage job postings
 */

'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { createClient } from '@supabase/supabase-js';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import styles from './page.module.css';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Tech stack options
const TECH_STACK_OPTIONS = [
  'JavaScript', 'TypeScript', 'Python', 'Java', 'C++', 'C#',
  'React', 'Angular', 'Vue', 'Node.js', 'Express',
  'SQL', 'PostgreSQL', 'MongoDB', 'Redis',
  'AWS', 'Azure', 'GCP', 'Docker', 'Kubernetes',
  'Git', 'CI/CD', 'REST APIs', 'GraphQL',
];

// Graduation date options
const GRADUATION_DATES = [
  'May 2025', 'August 2025', 'December 2025',
  'May 2026', 'August 2026', 'December 2026',
  'May 2027', 'August 2027', 'December 2027',
];

// Types
interface Requirement {
  id: string;
  company_id: string;
  position_title: string;
  job_description: string;
  tech_stack: string[];
  location_preferences: string[];
  desired_graduation_dates: string[];
  min_gpa: number | null;
  internal_notes: string | null;
  is_active: boolean;
  created_at: string;
  candidate_count?: number;
}

interface FormData {
  position_title: string;
  job_description: string;
  tech_stack: string[];
  location_preferences: string[];
  desired_graduation_dates: string[];
  min_gpa: string;
  internal_notes: string;
  is_active: boolean;
}

interface FormErrors {
  position_title?: string;
  job_description?: string;
  tech_stack?: string;
  location_preferences?: string;
  desired_graduation_dates?: string;
  min_gpa?: string;
}

const initialFormData: FormData = {
  position_title: '',
  job_description: '',
  tech_stack: [],
  location_preferences: [],
  desired_graduation_dates: ['May 2025', 'August 2025'],
  min_gpa: '',
  internal_notes: '',
  is_active: true,
};

export default function RequirementsPage() {
  return (
    <ProtectedRoute allowedRoles={['company']}>
      <Suspense fallback={<LoadingState />}>
        <RequirementsContent />
      </Suspense>
    </ProtectedRoute>
  );
}

function LoadingState() {
  return (
    <div className={styles.container}>
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}></div>
        <p className={styles.loadingText}>Loading requirements...</p>
      </div>
    </div>
  );
}

function RequirementsContent() {
  const { user } = useAuth();
  const [supabase] = useState(() => createClient(supabaseUrl, supabaseAnonKey));

  // State
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [companyId, setCompanyId] = useState<string | null>(null);

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [saving, setSaving] = useState(false);
  const [locationInput, setLocationInput] = useState('');

  // Delete confirmation
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // Fetch company and requirements
  const fetchData = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      // Get company for this user
      const { data: company, error: companyError } = await supabase
        .from('companies')
        .select('id')
        .eq('auth_user_id', user.id)
        .single();

      if (companyError) throw companyError;
      setCompanyId(company.id);

      // Fetch requirements
      const { data: reqs, error: reqsError } = await supabase
        .from('company_requirements')
        .select('*')
        .eq('company_id', company.id)
        .order('created_at', { ascending: false });

      if (reqsError) throw reqsError;

      // Get candidate counts for each requirement
      const reqIds = (reqs || []).map(r => r.id);
      let countsMap: Record<string, number> = {};

      if (reqIds.length > 0) {
        const { data: counts } = await supabase
          .from('candidate_submissions')
          .select('requirement_id')
          .in('requirement_id', reqIds);

        (counts || []).forEach((c: { requirement_id: string }) => {
          countsMap[c.requirement_id] = (countsMap[c.requirement_id] || 0) + 1;
        });
      }

      // Add counts to requirements
      const requirementsWithCounts = (reqs || []).map(r => ({
        ...r,
        candidate_count: countsMap[r.id] || 0,
      }));

      setRequirements(requirementsWithCounts);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load requirements');
    } finally {
      setLoading(false);
    }
  }, [user, supabase]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Validate form
  const validateForm = (): boolean => {
    const errors: FormErrors = {};

    if (!formData.position_title.trim()) {
      errors.position_title = 'Position title is required';
    }

    if (!formData.job_description.trim()) {
      errors.job_description = 'Job description is required';
    } else if (formData.job_description.trim().length < 50) {
      errors.job_description = 'Job description must be at least 50 characters';
    }

    if (formData.tech_stack.length === 0) {
      errors.tech_stack = 'Select at least one technology';
    }

    if (formData.location_preferences.length === 0) {
      errors.location_preferences = 'Add at least one location preference';
    }

    if (formData.desired_graduation_dates.length === 0) {
      errors.desired_graduation_dates = 'Select at least one graduation date';
    }

    if (formData.min_gpa) {
      const gpa = parseFloat(formData.min_gpa);
      if (isNaN(gpa) || gpa < 0 || gpa > 4) {
        errors.min_gpa = 'GPA must be between 0.00 and 4.00';
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle form submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm() || !companyId) return;

    setSaving(true);
    try {
      const payload = {
        company_id: companyId,
        position_title: formData.position_title.trim(),
        job_description: formData.job_description.trim(),
        tech_stack: formData.tech_stack,
        location_preferences: formData.location_preferences,
        desired_graduation_dates: formData.desired_graduation_dates,
        min_gpa: formData.min_gpa ? parseFloat(formData.min_gpa) : null,
        internal_notes: formData.internal_notes.trim() || null,
        is_active: formData.is_active,
      };

      if (editingId) {
        // Update existing
        const { error } = await supabase
          .from('company_requirements')
          .update(payload)
          .eq('id', editingId);

        if (error) throw error;
        setSuccess('Job requirement updated successfully!');
      } else {
        // Create new
        const { error } = await supabase
          .from('company_requirements')
          .insert(payload);

        if (error) throw error;
        setSuccess('Job requirement created successfully!');
      }

      // Reset form and refresh
      setShowForm(false);
      setEditingId(null);
      setFormData(initialFormData);
      fetchData();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error saving:', err);
      setError(err instanceof Error ? err.message : 'Failed to save requirement');
    } finally {
      setSaving(false);
    }
  };

  // Handle edit
  const handleEdit = (req: Requirement) => {
    setFormData({
      position_title: req.position_title,
      job_description: req.job_description,
      tech_stack: req.tech_stack || [],
      location_preferences: req.location_preferences || [],
      desired_graduation_dates: req.desired_graduation_dates || [],
      min_gpa: req.min_gpa?.toString() || '',
      internal_notes: req.internal_notes || '',
      is_active: req.is_active,
    });
    setEditingId(req.id);
    setFormErrors({});
    setShowForm(true);
  };

  // Handle delete
  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('company_requirements')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setRequirements(prev => prev.filter(r => r.id !== id));
      setDeleteConfirm(null);
      setSuccess('Job requirement deleted');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error deleting:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete');
    }
  };

  // Handle active toggle
  const handleToggleActive = async (id: string, currentState: boolean) => {
    try {
      const { error } = await supabase
        .from('company_requirements')
        .update({ is_active: !currentState })
        .eq('id', id);

      if (error) throw error;

      setRequirements(prev =>
        prev.map(r => (r.id === id ? { ...r, is_active: !currentState } : r))
      );
    } catch (err) {
      console.error('Error toggling:', err);
      setError(err instanceof Error ? err.message : 'Failed to update');
    }
  };

  // Handle tech stack toggle
  const toggleTechStack = (tech: string) => {
    setFormData(prev => ({
      ...prev,
      tech_stack: prev.tech_stack.includes(tech)
        ? prev.tech_stack.filter(t => t !== tech)
        : [...prev.tech_stack, tech],
    }));
  };

  // Handle graduation date toggle
  const toggleGradDate = (date: string) => {
    setFormData(prev => ({
      ...prev,
      desired_graduation_dates: prev.desired_graduation_dates.includes(date)
        ? prev.desired_graduation_dates.filter(d => d !== date)
        : [...prev.desired_graduation_dates, date],
    }));
  };

  // Handle location add
  const addLocation = () => {
    const loc = locationInput.trim();
    if (loc && !formData.location_preferences.includes(loc)) {
      setFormData(prev => ({
        ...prev,
        location_preferences: [...prev.location_preferences, loc],
      }));
      setLocationInput('');
    }
  };

  // Handle location remove
  const removeLocation = (loc: string) => {
    setFormData(prev => ({
      ...prev,
      location_preferences: prev.location_preferences.filter(l => l !== loc),
    }));
  };

  // Open new form
  const openNewForm = () => {
    setFormData(initialFormData);
    setEditingId(null);
    setFormErrors({});
    setShowForm(true);
  };

  // Close form
  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData(initialFormData);
    setFormErrors({});
  };

  if (error && requirements.length === 0) {
    return (
      <div className={styles.container}>
        <div className={styles.errorContainer}>
          <span className={styles.errorIcon}>⚠️</span>
          <h2>Unable to Load Requirements</h2>
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
        <div className={styles.headerContent}>
          <h1 className={styles.title}>Job Requirements</h1>
          <p className={styles.subtitle}>Create and manage your job postings</p>
        </div>
        <button onClick={openNewForm} className={styles.newButton}>
          + Post New Job
        </button>
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

      {/* Form Modal */}
      {showForm && (
        <div className={styles.modalOverlay} onClick={closeForm}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <button className={styles.modalClose} onClick={closeForm}>✕</button>
            <h2 className={styles.modalTitle}>
              {editingId ? 'Edit Job Requirement' : 'Post New Job'}
            </h2>

            <form onSubmit={handleSubmit} className={styles.form}>
              {/* Position Title */}
              <div className={styles.formGroup}>
                <label className={styles.label}>
                  Position Title <span className={styles.required}>*</span>
                </label>
                <input
                  type="text"
                  value={formData.position_title}
                  onChange={e => setFormData(prev => ({ ...prev, position_title: e.target.value }))}
                  className={`${styles.input} ${formErrors.position_title ? styles.inputError : ''}`}
                  placeholder="e.g., Junior Software Engineer"
                />
                {formErrors.position_title && (
                  <span className={styles.errorText}>{formErrors.position_title}</span>
                )}
              </div>

              {/* Job Description */}
              <div className={styles.formGroup}>
                <label className={styles.label}>
                  Job Description <span className={styles.required}>*</span>
                </label>
                <textarea
                  value={formData.job_description}
                  onChange={e => setFormData(prev => ({ ...prev, job_description: e.target.value }))}
                  className={`${styles.textarea} ${formErrors.job_description ? styles.inputError : ''}`}
                  placeholder="Describe the role, responsibilities, and ideal candidate..."
                  rows={6}
                />
                <span className={styles.charCount}>
                  {formData.job_description.length} / 50 min characters
                </span>
                {formErrors.job_description && (
                  <span className={styles.errorText}>{formErrors.job_description}</span>
                )}
              </div>

              {/* Tech Stack */}
              <div className={styles.formGroup}>
                <label className={styles.label}>
                  Tech Stack <span className={styles.required}>*</span>
                  <span className={styles.selectedCount}>
                    ({formData.tech_stack.length} selected)
                  </span>
                </label>
                <div className={styles.techGrid}>
                  {TECH_STACK_OPTIONS.map(tech => (
                    <button
                      key={tech}
                      type="button"
                      onClick={() => toggleTechStack(tech)}
                      className={`${styles.techTag} ${formData.tech_stack.includes(tech) ? styles.techSelected : ''}`}
                    >
                      {tech}
                    </button>
                  ))}
                </div>
                {formErrors.tech_stack && (
                  <span className={styles.errorText}>{formErrors.tech_stack}</span>
                )}
              </div>

              {/* Location Preferences */}
              <div className={styles.formGroup}>
                <label className={styles.label}>
                  Location Preferences <span className={styles.required}>*</span>
                </label>
                <div className={styles.locationInput}>
                  <input
                    type="text"
                    value={locationInput}
                    onChange={e => setLocationInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addLocation())}
                    className={styles.input}
                    placeholder="e.g., Remote, Tampa, FL, Hybrid"
                  />
                  <button type="button" onClick={addLocation} className={styles.addButton}>
                    Add
                  </button>
                </div>
                {formData.location_preferences.length > 0 && (
                  <div className={styles.locationChips}>
                    {formData.location_preferences.map(loc => (
                      <span key={loc} className={styles.locationChip}>
                        {loc}
                        <button type="button" onClick={() => removeLocation(loc)} className={styles.removeChip}>
                          ✕
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                {formErrors.location_preferences && (
                  <span className={styles.errorText}>{formErrors.location_preferences}</span>
                )}
              </div>

              {/* Graduation Dates */}
              <div className={styles.formGroup}>
                <label className={styles.label}>
                  Desired Graduation Dates <span className={styles.required}>*</span>
                </label>
                <div className={styles.checkboxGrid}>
                  {GRADUATION_DATES.map(date => (
                    <label key={date} className={styles.checkboxLabel}>
                      <input
                        type="checkbox"
                        checked={formData.desired_graduation_dates.includes(date)}
                        onChange={() => toggleGradDate(date)}
                        className={styles.checkbox}
                      />
                      {date}
                    </label>
                  ))}
                </div>
                {formErrors.desired_graduation_dates && (
                  <span className={styles.errorText}>{formErrors.desired_graduation_dates}</span>
                )}
              </div>

              {/* Min GPA */}
              <div className={styles.formGroup}>
                <label className={styles.label}>Minimum GPA</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="4"
                  value={formData.min_gpa}
                  onChange={e => setFormData(prev => ({ ...prev, min_gpa: e.target.value }))}
                  className={`${styles.input} ${styles.gpaInput} ${formErrors.min_gpa ? styles.inputError : ''}`}
                  placeholder="e.g., 3.00"
                />
                {formErrors.min_gpa && (
                  <span className={styles.errorText}>{formErrors.min_gpa}</span>
                )}
              </div>

              {/* Internal Notes */}
              <div className={styles.formGroup}>
                <label className={styles.label}>
                  Internal Notes
                  <span className={styles.privateLabel}>🔒 Private - Only visible to TalentBridge team</span>
                </label>
                <textarea
                  value={formData.internal_notes}
                  onChange={e => setFormData(prev => ({ ...prev, internal_notes: e.target.value }))}
                  className={styles.textarea}
                  placeholder="Any specific requirements or preferences we should know?"
                  rows={3}
                />
              </div>

              {/* Active Toggle */}
              <div className={styles.formGroup}>
                <label className={styles.toggleLabel}>
                  <span className={styles.toggleText}>
                    {formData.is_active ? 'Active' : 'Inactive'} - {formData.is_active ? 'Accepting candidates' : 'Paused'}
                  </span>
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, is_active: !prev.is_active }))}
                    className={`${styles.toggle} ${formData.is_active ? styles.toggleOn : ''}`}
                  >
                    <span className={styles.toggleKnob} />
                  </button>
                </label>
              </div>

              {/* Form Actions */}
              <div className={styles.formActions}>
                <button type="button" onClick={closeForm} className={styles.cancelButton}>
                  Cancel
                </button>
                <button type="submit" disabled={saving} className={styles.submitButton}>
                  {saving ? 'Saving...' : editingId ? 'Update Requirement' : 'Post Job'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Requirements List */}
      {loading ? (
        <LoadingState />
      ) : requirements.length === 0 ? (
        <div className={styles.emptyState}>
          <span className={styles.emptyIcon}>📋</span>
          <h2>No Job Requirements Yet</h2>
          <p>Create your first job posting to start receiving candidates.</p>
          <button onClick={openNewForm} className={styles.newButton}>
            + Post New Job
          </button>
        </div>
      ) : (
        <div className={styles.requirementsList}>
          {requirements.map(req => (
            <article
              key={req.id}
              className={`${styles.requirementCard} ${!req.is_active ? styles.inactive : ''}`}
            >
              <div className={styles.cardHeader}>
                <div className={styles.cardTitleRow}>
                  <h3 className={styles.positionTitle}>{req.position_title}</h3>
                  <div className={styles.cardActions}>
                    <label className={styles.toggleSmall}>
                      <input
                        type="checkbox"
                        checked={req.is_active}
                        onChange={() => handleToggleActive(req.id, req.is_active)}
                        className={styles.hiddenCheckbox}
                      />
                      <span className={`${styles.toggleTrack} ${req.is_active ? styles.toggleTrackOn : ''}`}>
                        <span className={styles.toggleThumb} />
                      </span>
                      <span className={styles.toggleState}>{req.is_active ? 'Active' : 'Inactive'}</span>
                    </label>
                    <button onClick={() => handleEdit(req)} className={styles.editButton}>
                      Edit
                    </button>
                    {deleteConfirm === req.id ? (
                      <div className={styles.deleteConfirm}>
                        <span>Delete?</span>
                        <button onClick={() => handleDelete(req.id)} className={styles.confirmYes}>Yes</button>
                        <button onClick={() => setDeleteConfirm(null)} className={styles.confirmNo}>No</button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setDeleteConfirm(req.id)}
                        className={styles.deleteButton}
                        title={req.candidate_count! > 0 ? `${req.candidate_count} candidates sent` : 'Delete'}
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
                {req.candidate_count! > 0 && (
                  <span className={styles.candidateCount}>
                    {req.candidate_count} candidate{req.candidate_count !== 1 ? 's' : ''} sent
                  </span>
                )}
              </div>

              <div className={styles.cardBody}>
                {/* Tech Stack */}
                {req.tech_stack && req.tech_stack.length > 0 && (
                  <div className={styles.cardSection}>
                    <span className={styles.sectionLabel}>Tech Stack</span>
                    <div className={styles.tags}>
                      {req.tech_stack.map(tech => (
                        <span key={tech} className={styles.tag}>{tech}</span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Location */}
                {req.location_preferences && req.location_preferences.length > 0 && (
                  <div className={styles.cardSection}>
                    <span className={styles.sectionLabel}>Locations</span>
                    <div className={styles.tags}>
                      {req.location_preferences.map(loc => (
                        <span key={loc} className={styles.locationTag}>📍 {loc}</span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Graduation Dates */}
                {req.desired_graduation_dates && req.desired_graduation_dates.length > 0 && (
                  <div className={styles.cardSection}>
                    <span className={styles.sectionLabel}>Graduation Dates</span>
                    <span className={styles.dateList}>
                      {req.desired_graduation_dates.join(', ')}
                    </span>
                  </div>
                )}

                {/* Min GPA */}
                {req.min_gpa && (
                  <div className={styles.cardSection}>
                    <span className={styles.sectionLabel}>Min GPA</span>
                    <span className={styles.gpaValue}>{req.min_gpa.toFixed(2)}</span>
                  </div>
                )}
              </div>

              {!req.is_active && (
                <div className={styles.inactiveBanner}>
                  This job posting is currently paused
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

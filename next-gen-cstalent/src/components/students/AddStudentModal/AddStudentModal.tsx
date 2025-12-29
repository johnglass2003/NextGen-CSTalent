/**
 * AddStudentModal
 * Modal form for adding new students to the system
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import styles from './AddStudentModal.module.css';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// =============================================================================
// Types
// =============================================================================

export type StudentStatus = 
  | 'Applied'
  | 'Assessment Pending'
  | 'Assessment Complete'
  | 'Interview Scheduled'
  | 'Vetted'
  | 'Matched'
  | 'Hired';

export type StudentSource = 
  | 'Website'
  | 'Referral'
  | 'Career Fair'
  | 'Direct Outreach'
  | 'Other';

interface FormData {
  // Basic Info
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  graduationYear: string;
  major: string;
  // Technical Profile
  primaryLanguages: string[];
  frameworks: string;
  github: string;
  linkedin: string;
  portfolio: string;
  // Preferences
  preferredLocations: string[];
  jobTypes: string[];
  desiredStartDate: string;
  salaryMin: string;
  salaryMax: string;
  // Status
  status: StudentStatus;
  source: StudentSource;
  notes: string;
}

interface FormErrors {
  [key: string]: string;
}

interface AddStudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

// =============================================================================
// Constants
// =============================================================================

const GRADUATION_YEARS = ['2024', '2025', '2026', '2027', '2028'];

const MAJORS = [
  'Computer Science',
  'Computer Engineering',
  'Software Engineering',
  'Data Science',
  'Other',
];

const LANGUAGES = [
  'Python',
  'Java',
  'JavaScript',
  'C++',
  'C#',
  'Go',
  'Rust',
  'Other',
];

const LOCATIONS = [
  'Florida',
  'Remote',
  'New York',
  'California',
  'Texas',
  'Other',
];

const JOB_TYPES = ['Full-time', 'Internship', 'Co-op', 'Part-time'];

const STATUSES: StudentStatus[] = [
  'Applied',
  'Assessment Pending',
  'Assessment Complete',
  'Interview Scheduled',
  'Vetted',
  'Matched',
  'Hired',
];

const SOURCES: StudentSource[] = [
  'Website',
  'Referral',
  'Career Fair',
  'Direct Outreach',
  'Other',
];

const initialFormData: FormData = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  graduationYear: '',
  major: '',
  primaryLanguages: [],
  frameworks: '',
  github: '',
  linkedin: '',
  portfolio: '',
  preferredLocations: [],
  jobTypes: [],
  desiredStartDate: '',
  salaryMin: '',
  salaryMax: '',
  status: 'Applied',
  source: 'Website',
  notes: '',
};

// =============================================================================
// Component
// =============================================================================

export default function AddStudentModal({ isOpen, onClose, onSuccess }: AddStudentModalProps) {
  const [supabase] = useState(() => createClient(supabaseUrl, supabaseAnonKey));
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [errors, setErrors] = useState<FormErrors>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setFormData(initialFormData);
      setErrors({});
      setSaveError(null);
      setHasChanges(false);
    }
  }, [isOpen]);

  // Track changes
  useEffect(() => {
    const changed = JSON.stringify(formData) !== JSON.stringify(initialFormData);
    setHasChanges(changed);
  }, [formData]);

  // Handle close with confirmation
  const handleClose = useCallback(() => {
    if (hasChanges) {
      const confirmed = window.confirm('You have unsaved changes. Are you sure you want to close?');
      if (!confirmed) return;
    }
    onClose();
  }, [hasChanges, onClose]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, handleClose]);

  // Validation
  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    // Required fields
    if (!formData.firstName.trim()) newErrors.firstName = 'This field is required';
    if (!formData.lastName.trim()) newErrors.lastName = 'This field is required';
    if (!formData.email.trim()) {
      newErrors.email = 'This field is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }
    if (!formData.graduationYear) newErrors.graduationYear = 'This field is required';
    if (!formData.major) newErrors.major = 'This field is required';

    // URL validation (optional fields)
    const urlRegex = /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/;
    if (formData.github && !urlRegex.test(formData.github)) {
      newErrors.github = 'Please enter a valid URL';
    }
    if (formData.linkedin && !urlRegex.test(formData.linkedin)) {
      newErrors.linkedin = 'Please enter a valid URL';
    }
    if (formData.portfolio && !urlRegex.test(formData.portfolio)) {
      newErrors.portfolio = 'Please enter a valid URL';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle input change
  const handleChange = (field: keyof FormData, value: string | string[]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when field is modified
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  // Handle checkbox array change
  const handleCheckboxChange = (field: 'primaryLanguages' | 'preferredLocations' | 'jobTypes', value: string) => {
    const currentValues = formData[field];
    const newValues = currentValues.includes(value)
      ? currentValues.filter(v => v !== value)
      : [...currentValues, value];
    handleChange(field, newValues);
  };

  // Format phone number
  const formatPhone = (value: string): string => {
    const digits = value.replace(/\D/g, '').slice(0, 10);
    if (digits.length >= 6) {
      return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
    } else if (digits.length >= 3) {
      return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
    }
    return digits;
  };

  // Handle phone change
  const handlePhoneChange = (value: string) => {
    handleChange('phone', formatPhone(value));
  };

  // Map form status to DB vetting_status
  const mapStatusToVetting = (status: StudentStatus): string => {
    const mapping: Record<StudentStatus, string> = {
      'Applied': 'pending_review',
      'Assessment Pending': 'pending_review',
      'Assessment Complete': 'pending_review',
      'Interview Scheduled': 'interview_scheduled',
      'Vetted': 'vetted',
      'Matched': 'vetted',
      'Hired': 'vetted',
    };
    return mapping[status];
  };

  // Handle submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setSaving(true);
    setSaveError(null);

    try {
      // Prepare data for database
      const studentData = {
        first_name: formData.firstName.trim(),
        last_name: formData.lastName.trim(),
        email: formData.email.trim().toLowerCase(),
        phone: formData.phone || null,
        graduation_year: parseInt(formData.graduationYear, 10),
        major: formData.major,
        skills: formData.primaryLanguages,
        frameworks: formData.frameworks ? formData.frameworks.split(',').map(f => f.trim()).filter(Boolean) : [],
        github_url: formData.github || null,
        linkedin_url: formData.linkedin || null,
        portfolio_url: formData.portfolio || null,
        location_preferences: formData.preferredLocations,
        job_types: formData.jobTypes,
        desired_start_date: formData.desiredStartDate || null,
        salary_min: formData.salaryMin ? parseInt(formData.salaryMin, 10) : null,
        salary_max: formData.salaryMax ? parseInt(formData.salaryMax, 10) : null,
        vetting_status: mapStatusToVetting(formData.status),
        source: formData.source,
        notes: formData.notes || null,
        overall_score: null,
        created_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('students')
        .insert(studentData);

      if (error) throw error;

      onSuccess();
      onClose();
    } catch (err) {
      console.error('Error saving student:', err);
      setSaveError(err instanceof Error ? err.message : 'Failed to save student. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  const isValid = formData.firstName && formData.lastName && formData.email && 
                  formData.graduationYear && formData.major && Object.keys(errors).length === 0;

  return (
    <div className={styles.overlay} onClick={handleClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()} role="dialog" aria-modal="true">
        <header className={styles.header}>
          <h2>Add New Student</h2>
          <button className={styles.closeButton} onClick={handleClose} aria-label="Close modal">
            ✕
          </button>
        </header>

        <form onSubmit={handleSubmit} className={styles.form}>
          {/* Basic Information */}
          <fieldset className={styles.fieldset}>
            <legend>Basic Information</legend>
            
            <div className={styles.row}>
              <div className={styles.field}>
                <label htmlFor="firstName">First Name *</label>
                <input
                  id="firstName"
                  type="text"
                  value={formData.firstName}
                  onChange={e => handleChange('firstName', e.target.value)}
                  className={errors.firstName ? styles.inputError : ''}
                />
                {errors.firstName && <span className={styles.error}>{errors.firstName}</span>}
              </div>
              <div className={styles.field}>
                <label htmlFor="lastName">Last Name *</label>
                <input
                  id="lastName"
                  type="text"
                  value={formData.lastName}
                  onChange={e => handleChange('lastName', e.target.value)}
                  className={errors.lastName ? styles.inputError : ''}
                />
                {errors.lastName && <span className={styles.error}>{errors.lastName}</span>}
              </div>
            </div>

            <div className={styles.row}>
              <div className={styles.field}>
                <label htmlFor="email">Email *</label>
                <input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={e => handleChange('email', e.target.value)}
                  className={errors.email ? styles.inputError : ''}
                />
                {errors.email && <span className={styles.error}>{errors.email}</span>}
              </div>
              <div className={styles.field}>
                <label htmlFor="phone">Phone</label>
                <input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={e => handlePhoneChange(e.target.value)}
                  placeholder="(555) 123-4567"
                />
              </div>
            </div>

            <div className={styles.row}>
              <div className={styles.field}>
                <label htmlFor="graduationYear">Graduation Year *</label>
                <select
                  id="graduationYear"
                  value={formData.graduationYear}
                  onChange={e => handleChange('graduationYear', e.target.value)}
                  className={errors.graduationYear ? styles.inputError : ''}
                >
                  <option value="">Select year...</option>
                  {GRADUATION_YEARS.map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
                {errors.graduationYear && <span className={styles.error}>{errors.graduationYear}</span>}
              </div>
              <div className={styles.field}>
                <label htmlFor="major">Major *</label>
                <select
                  id="major"
                  value={formData.major}
                  onChange={e => handleChange('major', e.target.value)}
                  className={errors.major ? styles.inputError : ''}
                >
                  <option value="">Select major...</option>
                  {MAJORS.map(major => (
                    <option key={major} value={major}>{major}</option>
                  ))}
                </select>
                {errors.major && <span className={styles.error}>{errors.major}</span>}
              </div>
            </div>
          </fieldset>

          {/* Technical Profile */}
          <fieldset className={styles.fieldset}>
            <legend>Technical Profile</legend>

            <div className={styles.field}>
              <label>Primary Languages</label>
              <div className={styles.checkboxGroup}>
                {LANGUAGES.map(lang => (
                  <label key={lang} className={styles.checkbox}>
                    <input
                      type="checkbox"
                      checked={formData.primaryLanguages.includes(lang)}
                      onChange={() => handleCheckboxChange('primaryLanguages', lang)}
                    />
                    {lang}
                  </label>
                ))}
              </div>
            </div>

            <div className={styles.field}>
              <label htmlFor="frameworks">Frameworks/Tools</label>
              <input
                id="frameworks"
                type="text"
                value={formData.frameworks}
                onChange={e => handleChange('frameworks', e.target.value)}
                placeholder="React, Node.js, AWS (comma-separated)"
              />
            </div>

            <div className={styles.row}>
              <div className={styles.field}>
                <label htmlFor="github">GitHub Profile</label>
                <input
                  id="github"
                  type="url"
                  value={formData.github}
                  onChange={e => handleChange('github', e.target.value)}
                  placeholder="https://github.com/username"
                  className={errors.github ? styles.inputError : ''}
                />
                {errors.github && <span className={styles.error}>{errors.github}</span>}
              </div>
              <div className={styles.field}>
                <label htmlFor="linkedin">LinkedIn Profile</label>
                <input
                  id="linkedin"
                  type="url"
                  value={formData.linkedin}
                  onChange={e => handleChange('linkedin', e.target.value)}
                  placeholder="https://linkedin.com/in/username"
                  className={errors.linkedin ? styles.inputError : ''}
                />
                {errors.linkedin && <span className={styles.error}>{errors.linkedin}</span>}
              </div>
            </div>

            <div className={styles.field}>
              <label htmlFor="portfolio">Portfolio/Website</label>
              <input
                id="portfolio"
                type="url"
                value={formData.portfolio}
                onChange={e => handleChange('portfolio', e.target.value)}
                placeholder="https://yourwebsite.com"
                className={errors.portfolio ? styles.inputError : ''}
              />
              {errors.portfolio && <span className={styles.error}>{errors.portfolio}</span>}
            </div>
          </fieldset>

          {/* Preferences */}
          <fieldset className={styles.fieldset}>
            <legend>Preferences</legend>

            <div className={styles.field}>
              <label>Preferred Locations</label>
              <div className={styles.checkboxGroup}>
                {LOCATIONS.map(loc => (
                  <label key={loc} className={styles.checkbox}>
                    <input
                      type="checkbox"
                      checked={formData.preferredLocations.includes(loc)}
                      onChange={() => handleCheckboxChange('preferredLocations', loc)}
                    />
                    {loc}
                  </label>
                ))}
              </div>
            </div>

            <div className={styles.field}>
              <label>Job Type</label>
              <div className={styles.checkboxGroup}>
                {JOB_TYPES.map(type => (
                  <label key={type} className={styles.checkbox}>
                    <input
                      type="checkbox"
                      checked={formData.jobTypes.includes(type)}
                      onChange={() => handleCheckboxChange('jobTypes', type)}
                    />
                    {type}
                  </label>
                ))}
              </div>
            </div>

            <div className={styles.row}>
              <div className={styles.field}>
                <label htmlFor="desiredStartDate">Desired Start Date</label>
                <input
                  id="desiredStartDate"
                  type="month"
                  value={formData.desiredStartDate}
                  onChange={e => handleChange('desiredStartDate', e.target.value)}
                />
              </div>
            </div>

            <div className={styles.row}>
              <div className={styles.field}>
                <label htmlFor="salaryMin">Salary Range Min</label>
                <div className={styles.inputWithPrefix}>
                  <span>$</span>
                  <input
                    id="salaryMin"
                    type="number"
                    value={formData.salaryMin}
                    onChange={e => handleChange('salaryMin', e.target.value)}
                    placeholder="50000"
                    min="0"
                  />
                </div>
              </div>
              <div className={styles.field}>
                <label htmlFor="salaryMax">Salary Range Max</label>
                <div className={styles.inputWithPrefix}>
                  <span>$</span>
                  <input
                    id="salaryMax"
                    type="number"
                    value={formData.salaryMax}
                    onChange={e => handleChange('salaryMax', e.target.value)}
                    placeholder="80000"
                    min="0"
                  />
                </div>
              </div>
            </div>
          </fieldset>

          {/* Status */}
          <fieldset className={styles.fieldset}>
            <legend>Status</legend>

            <div className={styles.row}>
              <div className={styles.field}>
                <label htmlFor="status">Current Status *</label>
                <select
                  id="status"
                  value={formData.status}
                  onChange={e => handleChange('status', e.target.value as StudentStatus)}
                >
                  {STATUSES.map(status => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
              </div>
              <div className={styles.field}>
                <label htmlFor="source">Source *</label>
                <select
                  id="source"
                  value={formData.source}
                  onChange={e => handleChange('source', e.target.value as StudentSource)}
                >
                  {SOURCES.map(source => (
                    <option key={source} value={source}>{source}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className={styles.field}>
              <label htmlFor="notes">Notes</label>
              <textarea
                id="notes"
                value={formData.notes}
                onChange={e => handleChange('notes', e.target.value)}
                placeholder="Initial notes about this student..."
                rows={3}
              />
            </div>
          </fieldset>

          {/* Error Message */}
          {saveError && (
            <div className={styles.saveError}>
              {saveError}
            </div>
          )}

          {/* Actions */}
          <div className={styles.actions}>
            <button type="button" className={styles.cancelButton} onClick={handleClose}>
              Cancel
            </button>
            <button 
              type="submit" 
              className={styles.submitButton} 
              disabled={saving || !isValid}
            >
              {saving ? 'Adding Student...' : 'Add Student'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

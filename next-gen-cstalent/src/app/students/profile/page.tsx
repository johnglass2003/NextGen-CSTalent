/**
 * Student Profile Edit Page
 * Allows students to update their profile information, skills, resume, and company interests
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import styles from './page.module.css';

// Form options
const MAJORS = [
  'Computer Science',
  'Computer Engineering',
  'Software Engineering',
  'Electrical Engineering',
  'Information Systems',
  'Data Science',
];

const GRADUATION_YEARS = ['2025', '2026', '2027', '2028', '2029'];

const TECHNICAL_SKILLS = [
  'JavaScript', 'TypeScript', 'Python', 'Java', 'C++', 'C#',
  'React', 'Angular', 'Vue', 'Node.js', 'Express',
  'SQL', 'PostgreSQL', 'MongoDB', 'Redis',
  'AWS', 'Azure', 'GCP', 'Docker', 'Kubernetes',
  'Git', 'CI/CD', 'REST APIs', 'GraphQL',
];

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_FILE_TYPES = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];

interface StudentProfile {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  major: string;
  graduation_year: string;
  gpa: number | null;
  location: string;
  linkedin_url: string;
  skills: string[];
  resume_url: string | null;
}

interface Company {
  id: string;
  company_name: string;
  industry: string;
  logo_url: string | null;
}

export default function StudentProfilePage() {
  return (
    <ProtectedRoute allowedRoles={['student']}>
      <ProfileForm />
    </ProtectedRoute>
  );
}

function ProfileForm() {
  const { user } = useAuth();
  
  // Form state
  const [formData, setFormData] = useState<Partial<StudentProfile>>({
    first_name: '',
    last_name: '',
    email: '',
    major: '',
    graduation_year: '',
    gpa: null,
    location: '',
    linkedin_url: '',
    skills: [],
    resume_url: null,
  });
  
  // Company interests
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompanyIds, setSelectedCompanyIds] = useState<string[]>([]);
  
  // Resume
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [currentResumeName, setCurrentResumeName] = useState<string | null>(null);
  
  // UI state
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [studentId, setStudentId] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // Fetch data on mount
  useEffect(() => {
    if (user) {
      fetchStudentProfile();
      fetchCompanies();
    }
  }, [user]);

  const fetchStudentProfile = async () => {
    try {
      console.log('Fetching student profile for user:', user?.id);
      
      // Get student profile
      const { data: student, error: studentError } = await supabase
        .from('students')
        .select('*')
        .eq('auth_user_id', user?.id)
        .single();

      console.log('Fetch result:', { student, error: studentError });

      if (studentError) throw studentError;

      if (student) {
        setStudentId(student.id);
        setFormData({
          first_name: student.first_name || '',
          last_name: student.last_name || '',
          email: student.email || '',
          major: student.major || '',
          graduation_year: student.graduation_year?.toString() || '',
          gpa: student.gpa,
          location: student.location || '',
          linkedin_url: student.linkedin_profile || '',
          skills: student.technical_skills || [],
          resume_url: student.resume_url,
        });

        // Extract resume filename from URL
        if (student.resume_url) {
          const urlParts = student.resume_url.split('/');
          setCurrentResumeName(urlParts[urlParts.length - 1]);
        }

        // Fetch company interests
        const { data: interests } = await supabase
          .from('student_company_interests')
          .select('company_id')
          .eq('student_id', student.id);

        if (interests) {
          setSelectedCompanyIds(interests.map(i => i.company_id));
        }
      }
    } catch (err) {
      console.error('Error fetching profile:', err);
      setError('Failed to load profile data');
    } finally {
      setLoading(false);
    }
  };

  const fetchCompanies = async () => {
    try {
      const { data, error } = await supabase
        .from('companies')
        .select('id, company_name, industry, logo_url')
        .eq('is_active', true)
        .eq('is_public', true)
        .order('company_name');

      if (error) throw error;
      setCompanies(data || []);
    } catch (err) {
      console.error('Error fetching companies:', err);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'gpa' ? (value ? parseFloat(value) : null) : value,
    }));
    // Clear validation error for this field
    if (validationErrors[name]) {
      setValidationErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const toggleSkill = (skill: string) => {
    setFormData(prev => ({
      ...prev,
      skills: prev.skills?.includes(skill)
        ? prev.skills.filter(s => s !== skill)
        : [...(prev.skills || []), skill],
    }));
  };

  const toggleCompanyInterest = (companyId: string) => {
    setSelectedCompanyIds(prev =>
      prev.includes(companyId)
        ? prev.filter(id => id !== companyId)
        : [...prev, companyId]
    );
  };

  const handleResumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      setError('Please upload a PDF or DOCX file');
      e.target.value = '';
      return;
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      setError('File size must be less than 5MB');
      e.target.value = '';
      return;
    }

    setResumeFile(file);
    setError(null);
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.first_name?.trim()) {
      errors.first_name = 'First name is required';
    }
    if (!formData.last_name?.trim()) {
      errors.last_name = 'Last name is required';
    }
    if (!formData.major) {
      errors.major = 'Major is required';
    }
    if (!formData.graduation_year) {
      errors.graduation_year = 'Graduation year is required';
    }
    if (formData.gpa !== null && formData.gpa !== undefined && (formData.gpa < 0 || formData.gpa > 4)) {
      errors.gpa = 'GPA must be between 0.00 and 4.00';
    }
    if (formData.linkedin_url && !formData.linkedin_url.includes('linkedin.com')) {
      errors.linkedin_url = 'Please enter a valid LinkedIn URL';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const uploadResume = async (): Promise<string | null> => {
    if (!resumeFile || !user) return formData.resume_url || null;

    try {
      const timestamp = Date.now();
      const fileName = `${timestamp}_${resumeFile.name}`;
      const filePath = `${user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('student-resumes')
        .upload(filePath, resumeFile);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('student-resumes')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (err) {
      console.error('Resume upload error:', err);
      throw new Error('Failed to upload resume');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    if (!studentId) {
      setError('Student profile not found');
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      // Upload resume if new file selected
      let resumeUrl = formData.resume_url;
      if (resumeFile) {
        resumeUrl = await uploadResume();
      }

      // Debug logging
      console.log('Saving profile with data:', {
        studentId,
        skills: formData.skills,
        skillsType: typeof formData.skills,
        skillsIsArray: Array.isArray(formData.skills),
      });

      // Update student profile - use correct database column names
      const updatePayload = {
        first_name: formData.first_name,
        last_name: formData.last_name,
        major: formData.major,
        graduation_year: formData.graduation_year,
        gpa: formData.gpa,
        location: formData.location,
        linkedin_profile: formData.linkedin_url,
        technical_skills: formData.skills || [],
        resume_url: resumeUrl,
        updated_at: new Date().toISOString(),
      };
      
      console.log('Update payload:', updatePayload);
      
      const { error: updateError, data: updateData } = await supabase
        .from('students')
        .update(updatePayload)
        .eq('id', studentId)
        .select();
      
      console.log('Update result:', { error: updateError, data: updateData });

      if (updateError) throw updateError;

      // Delete existing company interests
      await supabase
        .from('student_company_interests')
        .delete()
        .eq('student_id', studentId);

      // Insert new company interests
      if (selectedCompanyIds.length > 0) {
        const interests = selectedCompanyIds.map(companyId => ({
          student_id: studentId,
          company_id: companyId,
        }));

        const { error: interestError } = await supabase
          .from('student_company_interests')
          .insert(interests);

        if (interestError) throw interestError;
      }

      setSuccess('Profile updated successfully!');
      setResumeFile(null);
      
      // Update current resume name
      if (resumeUrl) {
        const urlParts = resumeUrl.split('/');
        setCurrentResumeName(urlParts[urlParts.length - 1]);
      }
      
      // Update form data with new resume URL
      setFormData(prev => ({ ...prev, resume_url: resumeUrl }));

    } catch (err: unknown) {
      console.error('Save error:', err);
      // Better error handling to show actual error message
      let errorMessage = 'Failed to save changes';
      if (err instanceof Error) {
        errorMessage = err.message;
      } else if (err && typeof err === 'object') {
        const errObj = err as { message?: string; error_description?: string; details?: string };
        errorMessage = errObj.message || errObj.error_description || errObj.details || JSON.stringify(err);
      }
      setError(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}></div>
        <p>Loading profile...</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Edit Profile</h1>
        <p className={styles.subtitle}>Keep your profile up to date to get matched with the best opportunities</p>
      </div>

      <form onSubmit={handleSubmit} className={styles.form}>
        {/* Messages */}
        {error && (
          <div className={styles.errorBanner}>
            <span>⚠️</span> {error}
          </div>
        )}
        {success && (
          <div className={styles.successBanner}>
            <span>✅</span> {success}
          </div>
        )}

        {/* Basic Information */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Basic Information</h2>
          
          <div className={styles.formGrid}>
            <div className={styles.formField}>
              <label className={styles.label}>
                First Name <span className={styles.required}>*</span>
              </label>
              <input
                type="text"
                name="first_name"
                value={formData.first_name}
                onChange={handleInputChange}
                className={`${styles.input} ${validationErrors.first_name ? styles.inputError : ''}`}
                disabled={saving}
              />
              {validationErrors.first_name && (
                <span className={styles.fieldError}>{validationErrors.first_name}</span>
              )}
            </div>

            <div className={styles.formField}>
              <label className={styles.label}>
                Last Name <span className={styles.required}>*</span>
              </label>
              <input
                type="text"
                name="last_name"
                value={formData.last_name}
                onChange={handleInputChange}
                className={`${styles.input} ${validationErrors.last_name ? styles.inputError : ''}`}
                disabled={saving}
              />
              {validationErrors.last_name && (
                <span className={styles.fieldError}>{validationErrors.last_name}</span>
              )}
            </div>

            <div className={styles.formField}>
              <label className={styles.label}>Email</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                className={`${styles.input} ${styles.inputDisabled}`}
                disabled
              />
              <span className={styles.fieldHint}>Email cannot be changed</span>
            </div>

            <div className={styles.formField}>
              <label className={styles.label}>
                Major <span className={styles.required}>*</span>
              </label>
              <select
                name="major"
                value={formData.major}
                onChange={handleInputChange}
                className={`${styles.select} ${validationErrors.major ? styles.inputError : ''}`}
                disabled={saving}
              >
                <option value="">Select major</option>
                {MAJORS.map(major => (
                  <option key={major} value={major}>{major}</option>
                ))}
              </select>
              {validationErrors.major && (
                <span className={styles.fieldError}>{validationErrors.major}</span>
              )}
            </div>

            <div className={styles.formField}>
              <label className={styles.label}>
                Graduation Year <span className={styles.required}>*</span>
              </label>
              <select
                name="graduation_year"
                value={formData.graduation_year}
                onChange={handleInputChange}
                className={`${styles.select} ${validationErrors.graduation_year ? styles.inputError : ''}`}
                disabled={saving}
              >
                <option value="">Select year</option>
                {GRADUATION_YEARS.map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
              {validationErrors.graduation_year && (
                <span className={styles.fieldError}>{validationErrors.graduation_year}</span>
              )}
            </div>

            <div className={styles.formField}>
              <label className={styles.label}>GPA</label>
              <input
                type="number"
                name="gpa"
                value={formData.gpa ?? ''}
                onChange={handleInputChange}
                className={`${styles.input} ${validationErrors.gpa ? styles.inputError : ''}`}
                min="0"
                max="4"
                step="0.01"
                placeholder="3.50"
                disabled={saving}
              />
              {validationErrors.gpa && (
                <span className={styles.fieldError}>{validationErrors.gpa}</span>
              )}
            </div>

            <div className={styles.formField}>
              <label className={styles.label}>Location</label>
              <input
                type="text"
                name="location"
                value={formData.location}
                onChange={handleInputChange}
                className={styles.input}
                placeholder="Tampa, FL"
                disabled={saving}
              />
            </div>

            <div className={styles.formField}>
              <label className={styles.label}>LinkedIn Profile</label>
              <input
                type="url"
                name="linkedin_url"
                value={formData.linkedin_url}
                onChange={handleInputChange}
                className={`${styles.input} ${validationErrors.linkedin_url ? styles.inputError : ''}`}
                placeholder="https://linkedin.com/in/yourprofile"
                disabled={saving}
              />
              {validationErrors.linkedin_url && (
                <span className={styles.fieldError}>{validationErrors.linkedin_url}</span>
              )}
            </div>
          </div>
        </section>

        {/* Technical Skills */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Technical Skills</h2>
          <p className={styles.sectionDescription}>Select all the skills that apply to you</p>
          
          <div className={styles.skillsGrid}>
            {TECHNICAL_SKILLS.map(skill => (
              <button
                key={skill}
                type="button"
                onClick={() => toggleSkill(skill)}
                className={`${styles.skillTag} ${formData.skills?.includes(skill) ? styles.skillTagSelected : ''}`}
                disabled={saving}
              >
                {skill}
              </button>
            ))}
          </div>
        </section>

        {/* Resume Upload */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Resume</h2>
          
          {currentResumeName && !resumeFile && (
            <div className={styles.currentResume}>
              <span className={styles.resumeIcon}>📄</span>
              <span className={styles.resumeName}>{currentResumeName}</span>
              <a
                href={formData.resume_url || '#'}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.downloadLink}
              >
                Download
              </a>
            </div>
          )}

          <div className={styles.uploadArea}>
            <input
              type="file"
              id="resume"
              accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              onChange={handleResumeChange}
              className={styles.fileInput}
              disabled={saving}
            />
            <label htmlFor="resume" className={styles.uploadLabel}>
              <span className={styles.uploadIcon}>📎</span>
              {resumeFile ? (
                <span className={styles.selectedFile}>{resumeFile.name}</span>
              ) : (
                <span>Click to upload new resume (PDF or DOCX, max 5MB)</span>
              )}
            </label>
          </div>
        </section>

        {/* Company Interests */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Company Interests</h2>
          <p className={styles.sectionDescription}>
            Select companies you&apos;re interested in working with ({selectedCompanyIds.length} selected)
          </p>
          
          {companies.length > 0 ? (
            <div className={styles.companiesGrid}>
              {companies.map(company => (
                <div
                  key={company.id}
                  onClick={() => toggleCompanyInterest(company.id)}
                  className={`${styles.companyCard} ${selectedCompanyIds.includes(company.id) ? styles.companyCardSelected : ''}`}
                >
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
                    <p className={styles.companyIndustry}>{company.industry}</p>
                  </div>
                  <div className={styles.companyCheckbox}>
                    {selectedCompanyIds.includes(company.id) ? '✓' : ''}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className={styles.emptyState}>
              <p>No companies available at this time</p>
            </div>
          )}
        </section>

        {/* Action Buttons */}
        <div className={styles.actions}>
          <button
            type="button"
            className={styles.cancelButton}
            onClick={() => window.history.back()}
            disabled={saving}
          >
            Cancel
          </button>
          <button
            type="submit"
            className={styles.saveButton}
            disabled={saving}
          >
            {saving ? (
              <>
                <span className={styles.buttonSpinner}></span>
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

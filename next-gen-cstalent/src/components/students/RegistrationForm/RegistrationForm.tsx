/**
 * RegistrationForm Component
 * Student registration form with controlled inputs and Supabase Auth
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { TECHNICAL_SKILLS, UF_MAJORS } from '@/lib/constants/skills';
import type { StudentRegistration } from '@/types/student';
import styles from './RegistrationForm.module.css';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

interface FormDataWithPassword extends Partial<StudentRegistration> {
  password: string;
  confirmPassword: string;
}

export default function RegistrationForm() {
  const router = useRouter();
  const [supabase] = useState(() => createClient(supabaseUrl, supabaseAnonKey));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormDataWithPassword>({
    firstName: '',
    lastName: '',
    email: '',
    major: '',
    graduationYear: '',
    gpa: '',
    linkedInUrl: '',
    skills: [],
    locationPreferences: [],
    password: '',
    confirmPassword: '',
  });

  const validateForm = (): string | null => {
    if (formData.password !== formData.confirmPassword) {
      return 'Passwords do not match';
    }
    if (formData.password.length < 8) {
      return 'Password must be at least 8 characters';
    }
    if (!formData.email?.endsWith('.edu')) {
      return 'Please use your .edu email address';
    }
    return null;
  };

  const getPasswordStrength = (password: string): { strength: string; color: string } => {
    if (password.length === 0) return { strength: '', color: '' };
    if (password.length < 8) return { strength: 'Too short', color: 'var(--color-error)' };
    
    let score = 0;
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    
    if (score < 3) return { strength: 'Weak', color: 'var(--color-error)' };
    if (score < 5) return { strength: 'Medium', color: 'var(--color-warning)' };
    return { strength: 'Strong', color: 'var(--color-success)' };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Validate form
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      setLoading(false);
      return;
    }

    try {
      // 1. Sign up with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email!,
        password: formData.password,
        options: {
          data: {
            role: 'student',
            first_name: formData.firstName,
            last_name: formData.lastName,
          },
        },
      });

      if (authError) {
        if (authError.message.includes('User already registered')) {
          setError('An account with this email already exists. Please login instead.');
        } else {
          setError(authError.message);
        }
        return;
      }

      if (!authData.user) {
        setError('Registration failed. Please try again.');
        return;
      }

      // 2. Insert into users table
      const { error: userInsertError } = await supabase
        .from('users')
        .insert({
          auth_user_id: authData.user.id,
          email: formData.email,
          role: 'student',
        });

      if (userInsertError) {
        console.error('Error inserting user:', userInsertError);
        setError('Failed to create user profile. Please contact support.');
        return;
      }

      // 3. Insert into students table
      const { error: studentInsertError } = await supabase
        .from('students')
        .insert({
          auth_user_id: authData.user.id,
          first_name: formData.firstName,
          last_name: formData.lastName,
          email: formData.email,
          major: formData.major,
          graduation_year: formData.graduationYear,
          gpa: parseFloat(formData.gpa || '0'),
          linkedin_url: formData.linkedInUrl,
          skills: formData.skills,
          location_preferences: formData.locationPreferences,
          vetting_status: 'pending_review',
        });

      if (studentInsertError) {
        console.error('Error inserting student:', studentInsertError);
        setError('Failed to create student profile. Please contact support.');
        return;
      }

      // 4. Auto sign-in (Supabase may auto-confirm in development)
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: formData.email!,
        password: formData.password,
      });

      if (signInError) {
        // If sign-in fails, user might need to confirm email
        router.push('/login?message=Please check your email to confirm your account');
        return;
      }

      // 5. Redirect to dashboard
      router.push('/students/dashboard');
    } catch (err) {
      console.error('Registration error:', err);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSkillToggle = (skill: string) => {
    setFormData((prev) => ({
      ...prev,
      skills: prev.skills?.includes(skill)
        ? prev.skills.filter((s) => s !== skill)
        : [...(prev.skills || []), skill],
    }));
  };

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      {/* Name Fields */}
      <div className={styles.formRow}>
        <FormField label="First Name" required>
          <input
            type="text"
            name="firstName"
            value={formData.firstName}
            onChange={handleInputChange}
            className={styles.input}
            required
          />
        </FormField>

        <FormField label="Last Name" required>
          <input
            type="text"
            name="lastName"
            value={formData.lastName}
            onChange={handleInputChange}
            className={styles.input}
            required
          />
        </FormField>
      </div>

      {/* Email */}
      <FormField label="Email" required>
        <input
          type="email"
          name="email"
          value={formData.email}
          onChange={handleInputChange}
          placeholder="yourname@.edu"
          className={styles.input}
          required
        />
        <p className={styles.fieldHint}>Use your @.edu email</p>
      </FormField>

      {/* Major and Graduation */}
      <div className={styles.formRow}>
        <FormField label="Major" required>
          <select
            name="major"
            value={formData.major}
            onChange={handleInputChange}
            className={styles.select}
            required
          >
            <option value="">Select major</option>
            {UF_MAJORS.map((major) => (
              <option key={major} value={major}>
                {major}
              </option>
            ))}
          </select>
        </FormField>

        <FormField label="Graduation Year" required>
          <select
            name="graduationYear"
            value={formData.graduationYear}
            onChange={handleInputChange}
            className={styles.select}
            required
          >
            <option value="">Select year</option>
            <option value="Spring 2025">Spring 2025</option>
            <option value="Fall 2025">Fall 2025</option>
            <option value="Spring 2026">Spring 2026</option>
            <option value="Fall 2026">Fall 2026</option>
            <option value="2027+">2027 or later</option>
          </select>
        </FormField>
      </div>

      {/* GPA */}
      <FormField label="GPA" required>
        <input
          type="text"
          name="gpa"
          value={formData.gpa}
          onChange={handleInputChange}
          placeholder="3.5"
          className={styles.input}
          required
        />
      </FormField>

      {/* Technical Skills */}
      <FormField label="Technical Skills" required>
        <p className={styles.fieldHint}>Select all that apply</p>
        <div className={styles.skillsGrid}>
          {TECHNICAL_SKILLS.map((skill) => (
            <label key={skill} className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={formData.skills?.includes(skill)}
                onChange={() => handleSkillToggle(skill)}
                className={styles.checkbox}
              />
              <span>{skill}</span>
            </label>
          ))}
        </div>
      </FormField>

      {/* LinkedIn */}
      <FormField label="LinkedIn Profile" required>
        <input
          type="url"
          name="linkedInUrl"
          value={formData.linkedInUrl}
          onChange={handleInputChange}
          placeholder="https://linkedin.com/in/yourprofile"
          className={styles.input}
          required
        />
      </FormField>

      {/* Password Fields */}
      <div className={styles.formRow}>
        <FormField label="Password" required>
          <input
            type="password"
            name="password"
            value={formData.password}
            onChange={handleInputChange}
            placeholder="Min 8 characters"
            className={styles.input}
            required
            minLength={8}
          />
          {formData.password && (
            <p 
              className={styles.passwordStrength}
              style={{ color: getPasswordStrength(formData.password).color }}
            >
              {getPasswordStrength(formData.password).strength}
            </p>
          )}
        </FormField>

        <FormField label="Confirm Password" required>
          <input
            type="password"
            name="confirmPassword"
            value={formData.confirmPassword}
            onChange={handleInputChange}
            placeholder="Confirm your password"
            className={styles.input}
            required
            minLength={8}
          />
          {formData.confirmPassword && formData.password !== formData.confirmPassword && (
            <p className={styles.fieldError}>Passwords do not match</p>
          )}
        </FormField>
      </div>

      {/* Error Display */}
      {error && (
        <div className={styles.errorMessage}>
          <span className={styles.errorIcon}>⚠️</span>
          {error}
        </div>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={loading}
        className={styles.submitButton}
      >
        {loading ? 'Creating Account...' : 'Create Account'}
      </button>
    </form>
  );
}

/**
 * FormField Component
 * Wrapper for form field with label
 */
function FormField({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={styles.formField}>
      <label className={styles.label}>
        {label} {required && <span className={styles.required}>*</span>}
      </label>
      {children}
    </div>
  );
}

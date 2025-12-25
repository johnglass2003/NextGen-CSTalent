/**
 * RegistrationForm Component
 * Student registration form with controlled inputs
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { TECHNICAL_SKILLS, UF_MAJORS } from '@/lib/constants/skills';
import type { StudentRegistration } from '@/types/student';
import styles from './RegistrationForm.module.css';

export default function RegistrationForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<Partial<StudentRegistration>>({
    firstName: '',
    lastName: '',
    email: '',
    major: '',
    graduationYear: '',
    gpa: '',
    linkedInUrl: '',
    skills: [],
    locationPreferences: [],
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/students/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        // TODO: Redirect to assessment page when implemented
        router.push('/students/register?success=true');
      } else {
        const error = await response.json();
        alert(`Registration failed: ${error.message}`);
      }
    } catch (error) {
      alert('An error occurred. Please try again.');
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

      {/* Submit */}
      <button
        type="submit"
        disabled={loading}
        className={styles.submitButton}
      >
        {loading ? 'Submitting...' : 'Submit Registration'}
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

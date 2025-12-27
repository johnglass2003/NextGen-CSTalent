/**
 * Company Registration Page
 * Registration form for companies to create an account
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';
import styles from './page.module.css';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

interface CompanyFormData {
  companyName: string;
  email: string;
  password: string;
  confirmPassword: string;
  industry: string;
  website: string;
  description: string;
  subscriptionTier: 'Starter' | 'Growth' | 'Enterprise';
}

export default function CompanyRegisterPage() {
  const router = useRouter();
  const [supabase] = useState(() => createClient(supabaseUrl, supabaseAnonKey));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<CompanyFormData>({
    companyName: '',
    email: '',
    password: '',
    confirmPassword: '',
    industry: '',
    website: '',
    description: '',
    subscriptionTier: 'Starter',
  });

  const validateForm = (): string | null => {
    if (formData.password !== formData.confirmPassword) {
      return 'Passwords do not match';
    }
    if (formData.password.length < 8) {
      return 'Password must be at least 8 characters';
    }
    if (!formData.companyName.trim()) {
      return 'Company name is required';
    }
    if (!formData.industry.trim()) {
      return 'Industry is required';
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

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError(null);
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
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            role: 'company',
            company_name: formData.companyName,
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
          role: 'company',
        });

      if (userInsertError) {
        console.error('Error inserting user:', userInsertError);
        setError('Failed to create user profile. Please contact support.');
        return;
      }

      // 3. Insert into companies table
      const { error: companyInsertError } = await supabase
        .from('companies')
        .insert({
          auth_user_id: authData.user.id,
          company_name: formData.companyName,
          email: formData.email,
          industry: formData.industry,
          website: formData.website || null,
          description: formData.description || null,
          subscription_tier: formData.subscriptionTier.toLowerCase(),
        });

      if (companyInsertError) {
        console.error('Error inserting company:', companyInsertError);
        setError('Failed to create company profile. Please contact support.');
        return;
      }

      // 4. Auto sign-in
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });

      if (signInError) {
        router.push('/login?message=Please check your email to confirm your account');
        return;
      }

      // 5. Redirect to dashboard
      router.push('/companies/dashboard');
    } catch (err) {
      console.error('Registration error:', err);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.header}>
          <h1 className={styles.title}>Partner With TalentBridge</h1>
          <p className={styles.subtitle}>
            Access pre-vetted engineering talent from top universities
          </p>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          {error && (
            <div className={styles.errorMessage}>
              <span className={styles.errorIcon}>⚠️</span>
              {error}
            </div>
          )}

          {/* Company Name */}
          <div className={styles.formField}>
            <label htmlFor="companyName" className={styles.label}>
              Company Name <span className={styles.required}>*</span>
            </label>
            <input
              type="text"
              id="companyName"
              name="companyName"
              value={formData.companyName}
              onChange={handleInputChange}
              className={styles.input}
              placeholder="Acme Inc."
              required
              disabled={loading}
            />
          </div>

          {/* Email */}
          <div className={styles.formField}>
            <label htmlFor="email" className={styles.label}>
              Business Email <span className={styles.required}>*</span>
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              className={styles.input}
              placeholder="hiring@company.com"
              required
              disabled={loading}
            />
          </div>

          {/* Password Fields */}
          <div className={styles.formRow}>
            <div className={styles.formField}>
              <label htmlFor="password" className={styles.label}>
                Password <span className={styles.required}>*</span>
              </label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                className={styles.input}
                placeholder="Min 8 characters"
                required
                minLength={8}
                disabled={loading}
              />
              {formData.password && (
                <p 
                  className={styles.passwordStrength}
                  style={{ color: getPasswordStrength(formData.password).color }}
                >
                  {getPasswordStrength(formData.password).strength}
                </p>
              )}
            </div>

            <div className={styles.formField}>
              <label htmlFor="confirmPassword" className={styles.label}>
                Confirm Password <span className={styles.required}>*</span>
              </label>
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                className={styles.input}
                placeholder="Confirm password"
                required
                minLength={8}
                disabled={loading}
              />
              {formData.confirmPassword && formData.password !== formData.confirmPassword && (
                <p className={styles.fieldError}>Passwords do not match</p>
              )}
            </div>
          </div>

          {/* Industry */}
          <div className={styles.formField}>
            <label htmlFor="industry" className={styles.label}>
              Industry <span className={styles.required}>*</span>
            </label>
            <input
              type="text"
              id="industry"
              name="industry"
              value={formData.industry}
              onChange={handleInputChange}
              className={styles.input}
              placeholder="e.g., Technology, Finance, Healthcare"
              required
              disabled={loading}
            />
          </div>

          {/* Website */}
          <div className={styles.formField}>
            <label htmlFor="website" className={styles.label}>
              Website
            </label>
            <input
              type="url"
              id="website"
              name="website"
              value={formData.website}
              onChange={handleInputChange}
              className={styles.input}
              placeholder="https://company.com"
              disabled={loading}
            />
          </div>

          {/* Description */}
          <div className={styles.formField}>
            <label htmlFor="description" className={styles.label}>
              Company Description
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              className={styles.textarea}
              placeholder="Tell us about your company and what kind of talent you're looking for..."
              rows={4}
              disabled={loading}
            />
          </div>

          {/* Subscription Tier */}
          <div className={styles.formField}>
            <label htmlFor="subscriptionTier" className={styles.label}>
              Subscription Plan
            </label>
            <select
              id="subscriptionTier"
              name="subscriptionTier"
              value={formData.subscriptionTier}
              onChange={handleInputChange}
              className={styles.select}
              disabled={loading}
            >
              <option value="Starter">Starter - Free Trial</option>
              <option value="Growth">Growth - $499/month</option>
              <option value="Enterprise">Enterprise - Contact Us</option>
            </select>
            <p className={styles.fieldHint}>
              You can upgrade your plan anytime from your dashboard
            </p>
          </div>

          <button
            type="submit"
            className={styles.submitButton}
            disabled={loading}
          >
            {loading ? (
              <>
                <span className={styles.spinner}></span>
                Creating Account...
              </>
            ) : (
              'Create Company Account'
            )}
          </button>
        </form>

        <div className={styles.footer}>
          <p className={styles.footerText}>
            Already have an account?{' '}
            <Link href="/login" className={styles.link}>
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

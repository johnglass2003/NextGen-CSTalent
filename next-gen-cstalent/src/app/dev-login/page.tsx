/**
 * Dev Login Page
 * Temporary bypass for development/testing - bypasses Supabase Auth
 * Uses actual user IDs from the database
 * 
 * ⚠️ REMOVE THIS FILE BEFORE PRODUCTION DEPLOYMENT
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { UserRole } from '@/contexts/AuthContext';
import styles from './page.module.css';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export default function DevLoginPage() {
  const router = useRouter();
  const [supabase] = useState(() => createClient(supabaseUrl, supabaseAnonKey));
  const [selectedRole, setSelectedRole] = useState<UserRole>('student');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    setLoading(true);
    setError(null);

    try {
      // Fetch an actual user from the database with the selected role
      const { data, error: fetchError } = await supabase
        .from('users')
        .select('id, email, role')
        .eq('role', selectedRole)
        .limit(1)
        .single();

      if (fetchError || !data) {
        setError(`No ${selectedRole} user found in database. Create test data first.`);
        setLoading(false);
        return;
      }

      // Store the actual user data in localStorage
      const devUser = {
        id: data.id,
        email: data.email,
        role: data.role as UserRole,
      };

      localStorage.setItem('dev_user', JSON.stringify(devUser));
      console.log('🔧 DEV MODE: Logged in as', devUser);

      // Redirect to appropriate dashboard
      router.push(`/${selectedRole}s/dashboard`);
    } catch (err) {
      console.error('Dev login error:', err);
      setError('Failed to login. Check console for details.');
    } finally {
      setLoading(false);
    }
  };

  const handleClearDevAuth = () => {
    localStorage.removeItem('dev_user');
    setError(null);
    alert('Dev auth cleared! Refresh the page.');
  };

  return (
    <div className={styles.container}>
      <div className={styles.warningBanner}>
        ⚠️ DEVELOPMENT ONLY - Remove before production
      </div>

      <div className={styles.card}>
        <h1 className={styles.title}>Dev Login</h1>
        <p className={styles.subtitle}>
          Bypass Supabase Auth for testing. Uses real user IDs from database.
        </p>

        {error && (
          <div className={styles.error}>
            {error}
          </div>
        )}

        <div className={styles.formGroup}>
          <label className={styles.label}>Select Role</label>
          <div className={styles.roleButtons}>
            {(['student', 'company', 'internal'] as UserRole[]).map((role) => (
              <button
                key={role}
                type="button"
                onClick={() => setSelectedRole(role)}
                className={`${styles.roleButton} ${selectedRole === role ? styles.roleButtonActive : ''}`}
              >
                {role.charAt(0).toUpperCase() + role.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={handleLogin}
          disabled={loading}
          className={styles.loginButton}
        >
          {loading ? 'Logging in...' : `Login as ${selectedRole}`}
        </button>

        <div className={styles.divider}>
          <span>or</span>
        </div>

        <button
          onClick={handleClearDevAuth}
          className={styles.clearButton}
        >
          Clear Dev Auth
        </button>

        <div className={styles.helpText}>
          <p><strong>How it works:</strong></p>
          <ol>
            <li>Select a role (student, company, or internal)</li>
            <li>Click login to fetch a real user with that role from the database</li>
            <li>The user&apos;s actual ID will be stored in localStorage</li>
            <li>AuthContext will use this instead of Supabase Auth</li>
          </ol>
        </div>
      </div>
    </div>
  );
}

/**
 * ProtectedRoute Component
 * Wraps pages that require authentication and specific roles
 * Uses AuthContext for centralized auth state management
 * In dev mode, redirects to /dev-login instead of /login
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, UserRole } from '@/contexts/AuthContext';
import styles from './ProtectedRoute.module.css';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles: UserRole[];
  redirectTo?: string;
}

// Use dev-login for development, change to /login for production
const DEFAULT_REDIRECT = '/dev-login';

export default function ProtectedRoute({
  children,
  allowedRoles,
  redirectTo = DEFAULT_REDIRECT,
}: ProtectedRouteProps) {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [checkComplete, setCheckComplete] = useState(false);

  useEffect(() => {
    if (loading) return;

    // Not authenticated - redirect to login
    if (!user) {
      router.push(redirectTo);
      return;
    }

    // Check if user has allowed role
    if (allowedRoles.includes(user.role)) {
      setIsAuthorized(true);
      setCheckComplete(true);
    } else {
      // Redirect to user's appropriate dashboard
      const dashboardRoutes: Record<UserRole, string> = {
        student: '/students/dashboard',
        company: '/companies/dashboard',
        internal: '/internal/dashboard',
      };
      router.push(dashboardRoutes[user.role]);
    }
  }, [user, loading, allowedRoles, router, redirectTo]);

  // Show loading while auth is being checked
  if (loading || (!checkComplete && !isAuthorized)) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}></div>
        <p className={styles.loadingText}>Verifying access...</p>
      </div>
    );
  }

  // Not authorized - will be redirected
  if (!isAuthorized) {
    return null;
  }

  return <>{children}</>;
}

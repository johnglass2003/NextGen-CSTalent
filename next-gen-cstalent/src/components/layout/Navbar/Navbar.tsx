/**
 * Navbar Component
 * Main navigation bar with conditional rendering based on auth state
 */

'use client';

import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { StudentNav, CompanyNav, InternalNav } from '@/components/navigation';
import styles from './Navbar.module.css';

export default function Navbar() {
  const { user, loading } = useAuth();

  return (
    <header className={styles.header}>
      <nav className={styles.navbar}>
        <Link href="/" className={styles.logo}>
          TalentBridge
        </Link>
        
        {loading ? (
          <div className={styles.loadingPlaceholder}>
            <span className={styles.loadingDot}></span>
          </div>
        ) : user ? (
          <AuthenticatedNav role={user.role} />
        ) : (
          <PublicNav />
        )}
      </nav>
    </header>
  );
}

function PublicNav() {
  return (
    <ul className={styles.navLinks}>
      <li>
        <Link href="/for-students" className={styles.navLink}>
          For Students
        </Link>
      </li>
      <li>
        <Link href="/for-companies" className={styles.navLink}>
          For Companies
        </Link>
      </li>
      <li>
        <Link href="/about" className={styles.navLink}>
          About
        </Link>
      </li>
      <li>
        <Link href="/login" className={styles.loginButton}>
          Login
        </Link>
      </li>
    </ul>
  );
}

function AuthenticatedNav({ role }: { role: 'student' | 'company' | 'internal' }) {
  switch (role) {
    case 'student':
      return <StudentNav />;
    case 'company':
      return <CompanyNav />;
    case 'internal':
      return <InternalNav />;
    default:
      return <PublicNav />;
  }
}

/**
 * CompanyNav Component
 * Navigation bar for authenticated companies
 */

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import styles from './CompanyNav.module.css';

const NAV_ITEMS = [
  { href: '/companies/dashboard', label: 'Dashboard' },
  { href: '/companies/requirements', label: 'Post Job' },
  { href: '/companies/candidates', label: 'Candidates' },
  { href: '/companies/billing', label: 'Billing' },
  { href: '/companies/messages', label: 'Messages' },
];

export default function CompanyNav() {
  const pathname = usePathname();
  const { signOut } = useAuth();

  const handleSignOut = async () => {
    try {
      await signOut();
      window.location.href = '/login';
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  return (
    <nav className={styles.nav}>
      <ul className={styles.navList}>
        {NAV_ITEMS.map(item => (
          <li key={item.href}>
            <Link
              href={item.href}
              className={`${styles.navLink} ${pathname === item.href ? styles.active : ''}`}
            >
              <span className={styles.label}>{item.label}</span>
            </Link>
          </li>
        ))}
      </ul>
      
      <div className={styles.actions}>
        <button onClick={handleSignOut} className={styles.logoutButton}>
          <span className={styles.label}>Logout</span>
        </button>
      </div>
    </nav>
  );
}

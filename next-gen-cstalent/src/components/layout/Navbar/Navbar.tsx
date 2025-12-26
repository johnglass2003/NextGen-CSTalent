/**
 * Navbar Component
 * Main navigation bar with logo and navigation links
 */

import Link from 'next/link';
import styles from './Navbar.module.css';

export default function Navbar() {
  return (
    <header className={styles.header}>
      <nav className={styles.navbar}>
        <Link href="/" className={styles.logo}>
          NextGen-CSTalent
        </Link>
        
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
        </ul>
      </nav>
    </header>
  );
}

/**
 * Footer Component
 * Site footer with links and copyright
 */

import Link from 'next/link';
import styles from './Footer.module.css';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className={styles.footer}>
      <div className={styles.container}>
        <div className={styles.footerGrid}>
          {/* Brand Section */}
          <section className={styles.brandSection}>
            <h3 className={styles.brandName}>NextGen-CSTalent</h3>
            <p className={styles.brandDescription}>
              Engineers vetting Engineers. Direct access to pre-vetted 
              technical talent.
            </p>
          </section>

          {/* Quick Links */}
          <nav className={styles.linksSection}>
            <h4 className={styles.linksTitle}>Quick Links</h4>
            <ul className={styles.linksList}>
              <li>
                <Link href="/for-students" scroll={true} className={styles.footerLink}>
                  For Students
                </Link>
              </li>
              <li>
                <Link href="/for-companies" scroll={true} className={styles.footerLink}>
                  For Companies
                </Link>
              </li>
              <li>
                <Link href="/about" scroll={true} className={styles.footerLink}>
                  About Us
                </Link>
              </li>
            </ul>
          </nav>

          {/* Contact Section */}
          <section className={styles.contactSection}>
            <h4 className={styles.linksTitle}>Contact</h4>
            <address className={styles.contactInfo}>
              <p>Gainesville, FL</p>
              <a href="mailto:hello@NextGen-CSTalent.dev" className={styles.footerLink}>
                hello@NextGen-CSTalent.dev
              </a>
            </address>
          </section>
        </div>

        {/* Copyright */}
        <div className={styles.copyright}>
          <p>&copy; {currentYear} NextGen-CSTalent. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}

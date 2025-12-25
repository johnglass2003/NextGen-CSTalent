/**
 * Landing Page
 * Home page with hero section, features, and team
 */

import Link from 'next/link';
import styles from './page.module.css';

export default function LandingPage() {
  return (
    <article className={styles.landingPage}>
      {/* Hero Section */}
      <section className={styles.heroSection}>
        <div className={styles.container}>
          <div className={styles.heroGrid}>
            {/* Hero Content */}
            <div className={styles.heroContent}>
              <span className={styles.badge}>UF Engineering Talent Pipeline</span>
              <h1 className={styles.heroTitle}>
                UF Engineers Vetting UF Engineers
              </h1>
              <p className={styles.heroDescription}>
                We&apos;re three UF engineering students who personally test, interview,
                and rank fellow Gators. Companies get pre-vetted technical talent.
                Students get real opportunities.
              </p>
              <ul className={styles.featureBadges}>
                <li className={styles.featureBadge}>
                  <CheckIcon />
                  <span>Peer-reviewed by engineers</span>
                </li>
                <li className={styles.featureBadge}>
                  <CheckIcon />
                  <span>No AI, just real feedback</span>
                </li>
                <li className={styles.featureBadge}>
                  <CheckIcon />
                  <span>UF network advantage</span>
                </li>
              </ul>
            </div>

            {/* CTA Cards */}
            <div className={styles.ctaCards}>
              <div className={`${styles.ctaCard} ${styles.ctaCardOrange}`}>
                <UsersIcon />
                <h3 className={styles.ctaTitle}>For Students</h3>
                <p className={styles.ctaDescription}>
                  Join the vetted talent pool and get connected with companies
                  actively hiring UF engineers
                </p>
                <Link href="/students/register" className={styles.ctaButton}>
                  Register &amp; Get Assessed
                </Link>
              </div>

              <div className={`${styles.ctaCard} ${styles.ctaCardBlue}`}>
                <BuildingIcon />
                <h3 className={styles.ctaTitle}>For Companies</h3>
                <p className={styles.ctaDescription}>
                  Access pre-vetted UF engineering talent without the agency fees
                  or LinkedIn costs
                </p>
                <Link href="/companies" className={styles.ctaButton}>
                  Schedule Discovery Call
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className={styles.howItWorksSection}>
        <div className={styles.container}>
          <h2 className={styles.sectionTitle}>How It Works</h2>
          <div className={styles.processGrid}>
            <div className={styles.processStep}>
              <div className={styles.processIcon}>
                <TargetIcon />
              </div>
              <h3 className={styles.processTitle}>Peer Technical Vetting</h3>
              <p className={styles.processDescription}>
                UF engineers review coding challenges and conduct technical
                screens. We know what it takes because we&apos;ve been there.
              </p>
            </div>

            <div className={styles.processStep}>
              <div className={styles.processIcon}>
                <StarIcon />
              </div>
              <h3 className={styles.processTitle}>Curated Matching</h3>
              <p className={styles.processDescription}>
                Companies tell us exactly what they need. We manually match
                students based on skills, location preferences, and culture fit.
              </p>
            </div>

            <div className={styles.processStep}>
              <div className={styles.processIcon}>
                <CheckIcon />
              </div>
              <h3 className={styles.processTitle}>No Recruiter Markup</h3>
              <p className={styles.processDescription}>
                Skip the $18K LinkedIn Recruiter fees and agency placement costs.
                Direct access to vetted UF talent.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section className={styles.teamSection}>
        <div className={styles.container}>
          <header className={styles.teamHeader}>
            <h2 className={styles.sectionTitle}>Meet Your UF Engineering Team</h2>
            <p className={styles.sectionSubtitle}>
              Three Gators who&apos;ve been through technical interviews and know
              what it takes
            </p>
          </header>
          <div className={styles.teamGrid}>
            <TeamMember name="Alex Foster" role="Co-Founder" school="UF CS '25" initials="AF" />
            <TeamMember name="Sarah Martinez" role="Co-Founder" school="UF CE '25" initials="SM" />
            <TeamMember name="Jordan Patel" role="Co-Founder" school="UF CS '26" initials="JP" />
          </div>
        </div>
      </section>
    </article>
  );
}

/**
 * TeamMember Component
 */
function TeamMember({
  name,
  role,
  school,
  initials,
}: {
  name: string;
  role: string;
  school: string;
  initials: string;
}) {
  return (
    <div className={styles.teamMember}>
      <div className={styles.teamAvatar}>{initials}</div>
      <h3 className={styles.teamName}>{name}</h3>
      <p className={styles.teamRole}>{role}</p>
      <p className={styles.teamSchool}>{school}</p>
    </div>
  );
}

/* Simple inline SVG icons to avoid external dependencies */
function CheckIcon() {
  return (
    <svg
      className={styles.icon}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg
      className={styles.ctaIcon}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function BuildingIcon() {
  return (
    <svg
      className={styles.ctaIcon}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="4" y="2" width="16" height="20" rx="2" ry="2" />
      <path d="M9 22v-4h6v4" />
      <path d="M8 6h.01" />
      <path d="M16 6h.01" />
      <path d="M12 6h.01" />
      <path d="M12 10h.01" />
      <path d="M12 14h.01" />
      <path d="M16 10h.01" />
      <path d="M16 14h.01" />
      <path d="M8 10h.01" />
      <path d="M8 14h.01" />
    </svg>
  );
}

function TargetIcon() {
  return (
    <svg
      className={styles.processIconSvg}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  );
}

function StarIcon() {
  return (
    <svg
      className={styles.processIconSvg}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}

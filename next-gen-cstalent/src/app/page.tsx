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
              <span className={styles.badge}>Computer Science Talent Pipeline</span>
              <h1 className={styles.heroTitle}>
                Engineers Vetting Engineers
              </h1>
              <p className={styles.heroDescription}>
                We&apos;re three engineering students who personally test, interview,
                and rank fellow students. Companies get pre-vetted technical talent.
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
                  <span>Competitive Pricing</span>
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
                  actively hiring engineers
                </p>
                <Link href="/for-students" className={styles.ctaButton}>
                  Apply to Join the NextGen Talent Pool
                </Link>
              </div>

              <div className={`${styles.ctaCard} ${styles.ctaCardBlue}`}>
                <BuildingIcon />
                <h3 className={styles.ctaTitle}>For Companies</h3>
                <p className={styles.ctaDescription}>
                  Access pre-vetted engineering talent without the agency fees or enterprise software pricings
                </p>
                <Link href="/for-companies" className={styles.ctaButton}>
                  Explore Our Hiring Solution
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Why NextGen CS Talent Section */}
      <section className={styles.whySection}>
        <div className={styles.container}>
          <h2 className={styles.sectionTitle}>Why NextGen CS Talent?</h2>
          <div className={styles.whyGrid}>
            <div className={styles.whyCard}>
              <div className={styles.whyIcon}>
                <CodeIcon />
              </div>
              <h3 className={styles.whyTitle}>Engineers Vetting Engineers</h3>
              <p className={styles.whyDescription}>
                Real engineering students conduct technical interviews. We&apos;ve been
                through the process and know what matters beyond a resume.
              </p>
            </div>

            <div className={styles.whyCard}>
              <div className={styles.whyIcon}>
                <TrophyIcon />
              </div>
              <h3 className={styles.whyTitle}>Top Performers Only</h3>
              <p className={styles.whyDescription}>
                Companies only see our highest-rated candidates. We proactively send
                profiles based on specific needs.
              </p>
            </div>

            <div className={styles.whyCard}>
              <div className={styles.whyIcon}>
                <MessageIcon />
              </div>
              <h3 className={styles.whyTitle}>No AI, Just Real Feedback</h3>
              <p className={styles.whyDescription}>
                Every candidate gets honest technical feedback from peers. Whether you
                make our top performer pool or not, you&apos;ll know where you stand.
              </p>
            </div>

            <div className={styles.whyCard}>
              <div className={styles.whyIcon}>
                <DollarIcon />
              </div>
              <h3 className={styles.whyTitle}>Transparent &amp; Affordable</h3>
              <p className={styles.whyDescription}>
                Students pay nothing. Companies get the most competitive rates in the industry.
              </p>
            </div>

            <div className={styles.whyCard}>
              <div className={styles.whyIcon}>
                <TargetIcon />
              </div>
              <h3 className={styles.whyTitle}>Tailored to Your Needs</h3>
              <p className={styles.whyDescription}>
                We build relationships with teams to understand exactly
                what you&apos;re looking for. Every candidate you see is hand-picked for your team.
              </p>
            </div>
          </div>
          <div className={styles.whyCta}>
            <Link href="/for-companies#how-were-different" className={styles.secondaryButton}>
              See How We&apos;re Different
            </Link>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className={styles.howItWorksSection}>
        <div className={styles.container}>
          <h2 className={styles.sectionTitle}>How It Works</h2>
          <div className={styles.howItWorksGrid}>
            {/* For Students */}
            <div className={styles.processColumn}>
              <h3 className={styles.processColumnTitle}>For Students</h3>
              <div className={styles.processSteps}>
                <div className={styles.processStepItem}>
                  <div className={styles.stepNumber}>1</div>
                  <div className={styles.stepContent}>
                    <h4 className={styles.stepTitle}>Apply Online</h4>
                    <p className={styles.stepDescription}>
                      Submit your resume and preferences. We review within 3 business days.
                    </p>
                  </div>
                </div>
                <div className={styles.processStepItem}>
                  <div className={styles.stepNumber}>2</div>
                  <div className={styles.stepContent}>
                    <h4 className={styles.stepTitle}>Get Interviewed</h4>
                    <p className={styles.stepDescription}>
                      If you&apos;re competitive, we&apos;ll send you a scheduling link for a
                      45-minute technical interview with our team.
                    </p>
                  </div>
                </div>
                <div className={styles.processStepItem}>
                  <div className={styles.stepNumber}>3</div>
                  <div className={styles.stepContent}>
                    <h4 className={styles.stepTitle}>Receive Feedback</h4>
                    <p className={styles.stepDescription}>
                      Everyone gets detailed technical feedback, whether you join our
                      top performer pool or not.
                    </p>
                  </div>
                </div>
                <div className={styles.processStepItem}>
                  <div className={styles.stepNumber}>4</div>
                  <div className={styles.stepContent}>
                    <h4 className={styles.stepTitle}>Get Matched</h4>
                    <p className={styles.stepDescription}>
                      Top performers get their profiles sent directly to companies
                      seeking their specific skills.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* For Companies */}
            <div className={styles.processColumn}>
              <h3 className={styles.processColumnTitleBlue}>For Companies</h3>
              <div className={styles.processSteps}>
                <div className={styles.processStepItem}>
                  <div className={`${styles.stepNumber} ${styles.stepNumberBlue}`}>1</div>
                  <div className={styles.stepContent}>
                    <h4 className={styles.stepTitle}>Tell Us Your Needs</h4>
                    <p className={styles.stepDescription}>
                      Schedule a discovery call. We learn about your tech stack, timeline,
                      location preferences, and culture.
                    </p>
                  </div>
                </div>
                <div className={styles.processStepItem}>
                  <div className={`${styles.stepNumber} ${styles.stepNumberBlue}`}>2</div>
                  <div className={styles.stepContent}>
                    <h4 className={styles.stepTitle}>Receive Top Performers</h4>
                    <p className={styles.stepDescription}>
                      We proactively send you top performing candidate profiles that match your requirements.
                      No sifting through hundreds of resumes.
                    </p>
                  </div>
                </div>
                <div className={styles.processStepItem}>
                  <div className={`${styles.stepNumber} ${styles.stepNumberBlue}`}>3</div>
                  <div className={styles.stepContent}>
                    <h4 className={styles.stepTitle}>Interview &amp; Hire</h4>
                    <p className={styles.stepDescription}>
                      Every candidate we send has been technically vetted by engineers.
                      Start with phone screens, not resume screening.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className={styles.processCtaButtons}>
            <Link href="/for-students" className={styles.primaryButton}>
              Student Process Details
            </Link>
            <Link href="/for-companies#our-solution" className={styles.secondaryButton}>
              Company Process Details
            </Link>
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section className={styles.teamSection}>
        <div className={styles.container}>
          <header className={styles.teamHeader}>
            <h2 className={styles.sectionTitle}>Meet Your Engineering Team</h2>
            <p className={styles.sectionSubtitle}>
              Three engineers who&apos;ve been through technical interviews and know
              what it takes
            </p>
          </header>
          <div className={styles.teamGrid}>
            <TeamMember name="John Glass" role="Co-Founder" school="CS '25" initials="JG" />
            <TeamMember name="Amanda Brannon" role="Co-Founder" school="CS '26" initials="AB" />
            <TeamMember name="Mattew Li" role="Co-Founder" school="CS '26" initials="ML" />
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

function CodeIcon() {
  return (
    <svg
      className={styles.whyIconSvg}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="16 18 22 12 16 6" />
      <polyline points="8 6 2 12 8 18" />
    </svg>
  );
}

function TrophyIcon() {
  return (
    <svg
      className={styles.whyIconSvg}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
      <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
      <path d="M4 22h16" />
      <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
      <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
      <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
    </svg>
  );
}

function MessageIcon() {
  return (
    <svg
      className={styles.whyIconSvg}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function DollarIcon() {
  return (
    <svg
      className={styles.whyIconSvg}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="12" y1="1" x2="12" y2="23" />
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  );
}

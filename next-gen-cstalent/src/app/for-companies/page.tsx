import Link from "next/link";
import styles from "./page.module.css";

export default function ForCompaniesPage() {
  return (
    <main className={styles.main}>
      {/* Hero Section */}
      <section className={styles.hero}>
        <div className={styles.container}>
          <h1 className={styles.heroTitle}>
            Hire Pre-Vetted CS Talent. Skip the Noise.
          </h1>
          <p className={styles.heroSubtitle}>
            We do the sourcing and screening — you just interview the best.
          </p>
          <Link href="#our-solution" className={styles.primaryButton}>
            See How It Works
          </Link>
        </div>
      </section>

      {/* The Recruiting Problem Section */}
      <section className={styles.section}>
        <div className={styles.container}>
          <h2 className={styles.sectionTitle}>The Recruiting Problem</h2>
          <div className={styles.problemGrid}>
            <div className={styles.problemCard}>
              <div className={styles.problemIcon}>
                <StackIcon />
              </div>
              <h3 className={styles.problemTitle}>Flooded Inboxes</h3>
              <p className={styles.problemDescription}>
                You post a job, get 500 applications, and spend weeks sorting 
                through resumes — most of which don&apos;t meet your bar.
              </p>
            </div>
            <div className={styles.problemCard}>
              <div className={styles.problemIcon}>
                <QuestionIcon />
              </div>
              <h3 className={styles.problemTitle}>Unknown Quality</h3>
              <p className={styles.problemDescription}>
                Resumes lie. You can&apos;t tell who can actually code until 
                you&apos;ve invested hours in interviews.
              </p>
            </div>
            <div className={styles.problemCard}>
              <div className={styles.problemIcon}>
                <ClockIcon />
              </div>
              <h3 className={styles.problemTitle}>Time Drain</h3>
              <p className={styles.problemDescription}>
                Your engineers spend more time interviewing unqualified 
                candidates than building product.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Our Solution Section */}
      <section id="our-solution" className={styles.solutionSection}>
        <div className={styles.container}>
          <h2 className={styles.sectionTitle}>Our Solution</h2>
          <p className={styles.solutionIntro}>
            We maintain a Talent Pool of top CS students who have already been 
            vetted through technical and behavioral interviews by current 
            students at top companies.
          </p>
          <div className={styles.solutionSteps}>
            <div className={styles.solutionStep}>
              <div className={styles.stepNumber}>1</div>
              <div className={styles.stepContent}>
                <h3 className={styles.stepTitle}>Tell us what you&apos;re looking for</h3>
                <p className={styles.stepDescription}>
                  Role type, tech stack, team culture, start date — we get to know 
                  your needs.
                </p>
              </div>
            </div>
            <div className={styles.solutionStep}>
              <div className={styles.stepNumber}>2</div>
              <div className={styles.stepContent}>
                <h3 className={styles.stepTitle}>We match you with candidates</h3>
                <p className={styles.stepDescription}>
                  You receive a shortlist of 3–5 pre-vetted students tailored to 
                  your requirements.
                </p>
              </div>
            </div>
            <div className={styles.solutionStep}>
              <div className={styles.stepNumber}>3</div>
              <div className={styles.stepContent}>
                <h3 className={styles.stepTitle}>You interview the best</h3>
                <p className={styles.stepDescription}>
                  Skip the resume pile. Go straight to high-quality conversations 
                  with top talent.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How We're Different Section */}
      <section id="how-were-different" className={styles.section}>
        <div className={styles.container}>
          <h2 className={styles.sectionTitle}>How We&apos;re Different</h2>
          <div className={styles.differenceGrid}>
            <div className={styles.differenceCard}>
              <h3 className={styles.differenceTitle}>Student-Run, Insider Knowledge</h3>
              <p className={styles.differenceDescription}>
                We&apos;re current and former interns at companies like Google, 
                Meta, and Amazon. We know what &quot;good&quot; looks like because 
                we&apos;ve been through the process ourselves.
              </p>
            </div>
            <div className={styles.differenceCard}>
              <h3 className={styles.differenceTitle}>Quality Over Quantity</h3>
              <p className={styles.differenceDescription}>
                We don&apos;t flood you with candidates. Every match is 
                intentional and based on fit.
              </p>
            </div>
            <div className={styles.differenceCard}>
              <h3 className={styles.differenceTitle}>Fast Turnaround</h3>
              <p className={styles.differenceDescription}>
                Need someone in 2 weeks? We move fast because our candidates 
                are already vetted and ready.
              </p>
            </div>
            <div className={styles.differenceCard}>
              <h3 className={styles.differenceTitle}>No Upfront Cost</h3>
              <p className={styles.differenceDescription}>
                You only pay when you hire. No subscription fees, no per-seat 
                pricing, no risk.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className={styles.pricingSection}>
        <div className={styles.container}>
          <h2 className={styles.sectionTitle}>Pricing</h2>
          <div className={styles.pricingCard}>
            <p className={styles.pricingDescription}>
              We charge a flat placement fee only when you successfully hire a 
              candidate from our pool.
            </p>
            <p className={styles.pricingNote}>
              No upfront cost. No monthly subscription. You only pay for results.
            </p>
            <Link href="#contact" className={styles.pricingCta}>
              Contact us for details
            </Link>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section id="contact" className={styles.ctaSection}>
        <div className={styles.container}>
          <h2 className={styles.ctaTitle}>Ready to Hire Smarter?</h2>
          <p className={styles.ctaDescription}>
            Let&apos;s talk about your hiring needs. Schedule a quick call and 
            we&apos;ll show you how NextGen CS Talent can help.
          </p>
          <a 
            href="mailto:contact@nextgencstalent.com" 
            className={styles.primaryButton}
          >
            Schedule a Call
          </a>
        </div>
      </section>
    </main>
  );
}

// Icon Components
function StackIcon() {
  return (
    <svg className={styles.iconSvg} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
    </svg>
  );
}

function QuestionIcon() {
  return (
    <svg className={styles.iconSvg} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg className={styles.iconSvg} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

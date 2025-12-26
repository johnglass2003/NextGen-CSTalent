import Link from "next/link";
import styles from "./page.module.css";

export default function ForStudentsPage() {
  return (
    <main className={styles.main}>
      {/* Hero Section */}
      <section className={styles.hero}>
        <div className={styles.container}>
          <h1 className={styles.heroTitle}>
            Stand Out. Get Noticed. Land the Job.
          </h1>
          <p className={styles.heroSubtitle}>
            Join the NextGen Talent Pool — a curated group of top CS students 
            ready to connect with leading companies.
          </p>
          <Link href="/students/register" className={styles.primaryButton}>
            Apply Now
          </Link>
        </div>
      </section>

      {/* The Process Section */}
      <section id="the-process" className={styles.processSection}>
        <div className={styles.container}>
          <h2 className={styles.sectionTitle}>The Process</h2>
          <div className={styles.processSteps}>
            <div className={styles.processStep}>
              <div className={styles.stepNumber}>1</div>
              <div className={styles.stepContent}>
                <h3 className={styles.stepTitle}>Apply</h3>
                <p className={styles.stepDescription}>
                  Fill out a short application with your resume, background, and goals. We'll get back to you within 3 business days.
                </p>
              </div>
            </div>
            <div className={styles.processStep}>
              <div className={styles.stepNumber}>2</div>
              <div className={styles.stepContent}>
                <h3 className={styles.stepTitle}>Interview</h3>
                <p className={styles.stepDescription}>
                  When selected, complete a 45-minute technical and behavioral interview with a member of our team.
                </p>
              </div>
            </div>
            <div className={styles.processStep}>
              <div className={styles.stepNumber}>3</div>
              <div className={styles.stepContent}>
                <h3 className={styles.stepTitle}>Receive Feedback</h3>
                <p className={styles.stepDescription}>
                  Everyone gets detailed feedback from our team. If you&apos;re not
                  in the top bracket, we&apos;ll show you what it takes to get there.
                </p>
              </div>
            </div>
            <div className={styles.processStep}>
              <div className={styles.stepNumber}>4</div>
              <div className={styles.stepContent}>
                <h3 className={styles.stepTitle}>Get Matched</h3>
                <p className={styles.stepDescription}>
                  Top performers get introduced to companies looking for candidates
                  like you.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Why Get Vetted Section */}
      <section className={styles.section}>
        <div className={styles.container}>
          <h2 className={styles.sectionTitle}>Why Get Vetted?</h2>
          <div className={styles.benefitsGrid}>
            <div className={styles.benefitCard}>
              <div className={styles.benefitIcon}>
                <CheckIcon />
              </div>
              <h3 className={styles.benefitTitle}>Credibility</h3>
              <p className={styles.benefitDescription}>
                Being in the NextGen Talent Pool tells employers you&apos;re among 
                the top CS students, not just someone who applied.
              </p>
            </div>
            <div className={styles.benefitCard}>
              <div className={styles.benefitIcon}>
                <EyeIcon />
              </div>
              <h3 className={styles.benefitTitle}>Visibility</h3>
              <p className={styles.benefitDescription}>
                Companies come to us looking for talent. Your profile gets seen 
                by hiring managers without you having to cold-apply.
              </p>
            </div>
            <div className={styles.benefitCard}>
              <div className={styles.benefitIcon}>
                <RocketIcon />
              </div>
              <h3 className={styles.benefitTitle}>Opportunity</h3>
              <p className={styles.benefitDescription}>
                We actively match vetted students with internships and 
                entry-level roles at companies that value quality over quantity.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How We're Different Section */}
      <section className={styles.differenceSection}>
        <div className={styles.container}>
          <h2 className={styles.sectionTitle}>We Get It. We&apos;ve Been There.</h2>
          <p className={styles.differenceIntro}>
            The job search is broken. You know it, we know it. 
            <strong> So we built something better.</strong>
          </p>
          <div className={styles.differenceGrid}>
            <div className={styles.differenceCard}>
              <div className={styles.differenceIcon}>
                <NoSpamIcon />
              </div>
              <h3 className={styles.differenceTitle}>No More Mass-Applying</h3>
              <p className={styles.differenceDescription}>
                Get vetted once. Let companies find you.
              </p>
            </div>
            <div className={styles.differenceCard}>
              <div className={styles.differenceIcon}>
                <FeedbackIcon />
              </div>
              <h3 className={styles.differenceTitle}>Real Feedback</h3>
              <p className={styles.differenceDescription}>
                Actionable insights on your skills, not a generic rejection.
              </p>
            </div>
            <div className={styles.differenceCard}>
              <div className={styles.differenceIcon}>
                <ConnectionIcon />
              </div>
              <h3 className={styles.differenceTitle}>Direct Connections</h3>
              <p className={styles.differenceDescription}>
                Skip the resume black hole. Get seen by hiring managers.
              </p>
            </div>
            <div className={styles.differenceCard}>
              <div className={styles.differenceIcon}>
                <EngineerIcon />
              </div>
              <h3 className={styles.differenceTitle}>Evaluated by Engineers</h3>
              <p className={styles.differenceDescription}>
                Real engineers review your work, not AI filters.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* What You Get Section */}
      <section className={styles.section}>
        <div className={styles.container}>
          <h2 className={styles.sectionTitle}>What You Get</h2>
          <div className={styles.whatYouGetGrid}>
            <div className={styles.whatYouGetItem}>
              <ProfileIcon />
              <span>A verified profile that companies can browse</span>
            </div>
            <div className={styles.whatYouGetItem}>
              <MailIcon />
              <span>Introductions to companies hiring for your skills</span>
            </div>
            <div className={styles.whatYouGetItem}>
              <SupportIcon />
              <span>Interview prep and resume tips (optional)</span>
            </div>
            <div className={styles.whatYouGetItem}>
              <DollarIcon />
              <span>It&apos;s 100% free for students</span>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className={styles.ctaSection}>
        <div className={styles.container}>
          <h2 className={styles.ctaTitle}>Ready to Stand Out?</h2>
          <p className={styles.ctaDescription}>
            Spots in the Talent Pool are limited. Apply today and take the first 
            step toward landing your dream internship or job.
          </p>
          <Link href="/students/register" className={styles.primaryButton}>
            Apply Now
          </Link>
        </div>
      </section>
    </main>
  );
}

// Icon Components
function CheckIcon() {
  return (
    <svg className={styles.iconSvg} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg className={styles.iconSvg} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  );
}

function RocketIcon() {
  return (
    <svg className={styles.iconSvg} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  );
}

function ProfileIcon() {
  return (
    <svg className={styles.itemIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg className={styles.itemIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  );
}

function SupportIcon() {
  return (
    <svg className={styles.itemIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  );
}

function DollarIcon() {
  return (
    <svg className={styles.itemIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

// How We're Different Icons
function NoSpamIcon() {
  return (
    <svg className={styles.iconSvg} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
    </svg>
  );
}

function FeedbackIcon() {
  return (
    <svg className={styles.iconSvg} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </svg>
  );
}

function ConnectionIcon() {
  return (
    <svg className={styles.iconSvg} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
    </svg>
  );
}

function EngineerIcon() {
  return (
    <svg className={styles.iconSvg} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
    </svg>
  );
}

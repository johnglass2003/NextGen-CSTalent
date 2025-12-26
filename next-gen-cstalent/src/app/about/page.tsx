import styles from "./page.module.css";

export default function AboutPage() {
  return (
    <main className={styles.main}>
      {/* Hero Section */}
      <section className={styles.hero}>
        <div className={styles.container}>
          <h1 className={styles.heroTitle}>About NextGen CS Talent</h1>
          <p className={styles.heroSubtitle}>
            Built by students who&apos;ve been through the process — for students 
            and companies who deserve better.
          </p>
        </div>
      </section>

      {/* Our Story Section */}
      <section className={styles.storySection}>
        <div className={styles.container}>
          <div className={styles.storyContent}>
            <h2 className={styles.storyTitle}>Our Story</h2>
            
            <p className={styles.storyParagraph}>
              We started NextGen CS Talent because we lived the problem firsthand.
            </p>

            <p className={styles.storyParagraph}>
              As computer science students, we spent countless hours applying to 
              hundreds of internships — tailoring resumes, writing cover letters, 
              grinding LeetCode — only to hear crickets from most companies. The 
              process felt like shouting into a void.
            </p>

            <p className={styles.storyParagraph}>
              On the other side, we watched our friends at startups and mid-sized 
              companies struggle to find quality candidates. They&apos;d post a 
              job, get flooded with applications, and waste engineering hours 
              interviewing people who couldn&apos;t pass a basic coding screen.
            </p>

            <p className={styles.storyParagraph}>
              Both sides were frustrated. Students couldn&apos;t get noticed. 
              Companies couldn&apos;t find talent. The system was broken.
            </p>

            <div className={styles.storyHighlight}>
              <p>
                So we built something different.
              </p>
            </div>

            <p className={styles.storyParagraph}>
              NextGen CS Talent is a curated talent pool where top CS students 
              are vetted by people who know what &quot;good&quot; looks like — 
              current and former interns at companies like Google, Meta, Amazon, 
              and top startups. We interview students for both technical ability 
              and communication skills, then connect them directly with companies 
              looking for quality over quantity.
            </p>

            <p className={styles.storyParagraph}>
              For students, it&apos;s a way to stand out without mass-applying. 
              For companies, it&apos;s a shortcut to the top of the talent pool.
            </p>

            <p className={styles.storyParagraph}>
              We&apos;re not a job board. We&apos;re not a recruiting agency in 
              the traditional sense. We&apos;re a bridge — built by students, for 
              students and the companies smart enough to hire them.
            </p>

            <div className={styles.storySignature}>
              <p>— The NextGen CS Talent Team</p>
            </div>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className={styles.valuesSection}>
        <div className={styles.container}>
          <h2 className={styles.sectionTitle}>What We Believe</h2>
          <div className={styles.valuesGrid}>
            <div className={styles.valueCard}>
              <h3 className={styles.valueTitle}>Quality Over Quantity</h3>
              <p className={styles.valueDescription}>
                We&apos;d rather make 10 great matches than 100 mediocre ones. 
                Every connection we make is intentional.
              </p>
            </div>
            <div className={styles.valueCard}>
              <h3 className={styles.valueTitle}>Transparency</h3>
              <p className={styles.valueDescription}>
                No hidden fees, no mysterious algorithms. Students know where 
                they stand, and companies know what they&apos;re getting.
              </p>
            </div>
            <div className={styles.valueCard}>
              <h3 className={styles.valueTitle}>Student-First</h3>
              <p className={styles.valueDescription}>
                We were students. We remember the struggle. Everything we build 
                starts with making the process better for candidates.
              </p>
            </div>
            <div className={styles.valueCard}>
              <h3 className={styles.valueTitle}>Insider Expertise</h3>
              <p className={styles.valueDescription}>
                We&apos;ve been through the interviews, landed the offers, and 
                worked at top companies. We know what it takes to succeed.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section className={styles.contactSection}>
        <div className={styles.container}>
          <h2 className={styles.contactTitle}>Get in Touch</h2>
          <p className={styles.contactDescription}>
            Have questions? Want to learn more? We&apos;d love to hear from you.
          </p>
          <a 
            href="mailto:contact@nextgencstalent.com" 
            className={styles.contactButton}
          >
            contact@nextgencstalent.com
          </a>
        </div>
      </section>
    </main>
  );
}

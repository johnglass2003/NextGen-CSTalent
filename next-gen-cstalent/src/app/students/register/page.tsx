/**
 * Student Registration Page
 * Page for students to register for the talent pool
 */

import RegistrationForm from '@/components/students/RegistrationForm';
import styles from './page.module.css';

export const metadata = {
  title: 'Register - TalentBridge',
  description: 'Join the TalentBridge talent pool and get connected with companies hiring UF engineers.',
};

export default function RegisterPage() {
  return (
    <article className={styles.registerPage}>
      <div className={styles.container}>
        {/* Header */}
        <header className={styles.header}>
          <h1 className={styles.title}>Join the Talent Pool</h1>
          <p className={styles.subtitle}>
            Register to get vetted by our team of UF engineers and connect with 
            companies actively looking for talent like you.
          </p>
        </header>

        {/* Registration Form */}
        <section className={styles.formSection}>
          <RegistrationForm />
        </section>

        {/* Info Section */}
        <aside className={styles.infoSection}>
          <h2 className={styles.infoTitle}>What Happens Next?</h2>
          <ol className={styles.infoList}>
            <li className={styles.infoItem}>
              <span className={styles.infoNumber}>1</span>
              <div>
                <h3>Submit Your Profile</h3>
                <p>Complete the registration form with your details and skills.</p>
              </div>
            </li>
            <li className={styles.infoItem}>
              <span className={styles.infoNumber}>2</span>
              <div>
                <h3>Technical Assessment</h3>
                <p>Complete a peer-reviewed coding challenge assessed by UF engineers.</p>
              </div>
            </li>
            <li className={styles.infoItem}>
              <span className={styles.infoNumber}>3</span>
              <div>
                <h3>Get Matched</h3>
                <p>We&apos;ll connect you with companies looking for your specific skills.</p>
              </div>
            </li>
          </ol>
        </aside>
      </div>
    </article>
  );
}

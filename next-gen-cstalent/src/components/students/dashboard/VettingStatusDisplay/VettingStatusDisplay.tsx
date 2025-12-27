/**
 * VettingStatusDisplay Component
 * Displays the student's vetting status with appropriate styling and messaging
 */

import Link from 'next/link';
import type { VettingStatus } from '@/types/dashboard';
import styles from './VettingStatusDisplay.module.css';

interface VettingStatusDisplayProps {
  status: VettingStatus;
  interviewDate?: string | null;
  overallScore?: number | null;
  feedback?: string | null;
}

const STATUS_CONFIG: Record<VettingStatus, {
  icon: string;
  title: string;
  colorClass: string;
}> = {
  pending_review: {
    icon: '🟡',
    title: 'Pending Review',
    colorClass: 'warning',
  },
  interview_scheduled: {
    icon: '📅',
    title: 'Interview Scheduled',
    colorClass: 'info',
  },
  vetted: {
    icon: '✅',
    title: "You're Vetted!",
    colorClass: 'success',
  },
  not_accepted: {
    icon: '❌',
    title: 'Not Accepted',
    colorClass: 'danger',
  },
};

export default function VettingStatusDisplay({
  status,
  interviewDate,
  overallScore,
  feedback,
}: VettingStatusDisplayProps) {
  const config = STATUS_CONFIG[status];
  
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const renderMessage = () => {
    switch (status) {
      case 'pending_review':
        return (
          <p className={styles.message}>
            We&apos;re reviewing your application. You&apos;ll hear from us within 3 business days!
          </p>
        );
      
      case 'interview_scheduled':
        return (
          <div className={styles.interviewInfo}>
            <p className={styles.message}>
              Your interview is scheduled for:
            </p>
            <p className={styles.interviewDate}>
              {interviewDate ? formatDate(interviewDate) : 'Date to be confirmed'}
            </p>
            <Link href="/students/schedule" className={styles.actionButton}>
              Change Interview Date
            </Link>
          </div>
        );
      
      case 'vetted':
        return (
          <div className={styles.vettedInfo}>
            <p className={styles.message}>
              Congratulations! You&apos;ve been vetted and your profile is now visible to companies.
            </p>
            {overallScore !== null && overallScore !== undefined && (
              <div className={styles.scoreDisplay}>
                <span className={styles.scoreLabel}>Your Score</span>
                <span className={styles.scoreValue}>{overallScore}/100</span>
              </div>
            )}
          </div>
        );
      
      case 'not_accepted':
        return (
          <div className={styles.notAcceptedInfo}>
            {feedback && (
              <div className={styles.feedbackBox}>
                <p className={styles.feedbackLabel}>Feedback:</p>
                <p className={styles.feedbackText}>{feedback}</p>
              </div>
            )}
            <p className={styles.reapplyMessage}>
              Don&apos;t give up! You can reapply in 3 months after improving your skills.
            </p>
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className={`${styles.statusCard} ${styles[config.colorClass]}`}>
      <div className={styles.header}>
        <span className={styles.icon}>{config.icon}</span>
        <h2 className={styles.title}>{config.title}</h2>
      </div>
      {renderMessage()}
    </div>
  );
}

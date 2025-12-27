/**
 * ActivityItem Component
 * Displays a single activity item in the recent activity list
 */

import type { ActivityItem as ActivityItemType } from '@/types/dashboard';
import styles from './ActivityItem.module.css';

interface ActivityItemProps {
  activity: ActivityItemType;
}

const ACTIVITY_MESSAGES: Record<ActivityItemType['type'], (companyName: string) => string> = {
  profile_sent: (companyName) => `Your profile was sent to ${companyName}`,
  interested: (companyName) => `${companyName} marked you as interested`,
  interview_scheduled: (companyName) => `Interview scheduled with ${companyName}`,
  status_update: (companyName) => `Status updated for ${companyName}`,
};

const ACTIVITY_ICONS: Record<ActivityItemType['type'], string> = {
  profile_sent: '📤',
  interested: '⭐',
  interview_scheduled: '📅',
  status_update: '🔄',
};

export default function ActivityItem({ activity }: ActivityItemProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const message = ACTIVITY_MESSAGES[activity.type](activity.companyName);
  const icon = ACTIVITY_ICONS[activity.type];

  return (
    <div className={styles.activityItem}>
      <span className={styles.icon}>{icon}</span>
      <div className={styles.content}>
        <p className={styles.message}>{message}</p>
        <span className={styles.date}>{formatDate(activity.date)}</span>
      </div>
      {activity.status && (
        <span className={`${styles.status} ${styles[activity.status.replace('_', '-')]}`}>
          {activity.status.replace('_', ' ')}
        </span>
      )}
    </div>
  );
}

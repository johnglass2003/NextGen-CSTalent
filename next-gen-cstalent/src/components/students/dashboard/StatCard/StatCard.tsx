/**
 * StatCard Component
 * Displays a single statistic with icon, title, and value
 */

import styles from './StatCard.module.css';

interface StatCardProps {
  title: string;
  value: number;
  icon: string;
}

export default function StatCard({ title, value, icon }: StatCardProps) {
  return (
    <div className={styles.statCard}>
      <div className={styles.iconContainer}>
        <span className={styles.icon}>{icon}</span>
      </div>
      <div className={styles.content}>
        <span className={styles.value}>{value}</span>
        <span className={styles.title}>{title}</span>
      </div>
    </div>
  );
}

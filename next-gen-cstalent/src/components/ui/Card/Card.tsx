/**
 * Card Component
 * Reusable card container with optional variants
 */

import styles from './Card.module.css';

interface CardProps {
  variant?: 'default' | 'elevated' | 'bordered';
  padding?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
  className?: string;
}

export default function Card({
  variant = 'default',
  padding = 'md',
  children,
  className,
}: CardProps) {
  const classNames = [
    styles.card,
    styles[variant],
    styles[`padding-${padding}`],
    className,
  ].filter(Boolean).join(' ');

  return (
    <article className={classNames}>
      {children}
    </article>
  );
}

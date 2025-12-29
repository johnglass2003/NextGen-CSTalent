/**
 * AssessmentHistory
 * Displays a student's assessment history with expandable details
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import type { Assessment, Recommendation } from '@/types/assessment';
import styles from './AssessmentHistory.module.css';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// =============================================================================
// Types
// =============================================================================

interface AssessmentHistoryProps {
  studentId: string;
  studentName: string;
}

// =============================================================================
// Helper Functions
// =============================================================================

function getScoreColor(score: number): string {
  if (score >= 80) return styles.scoreHigh;
  if (score >= 60) return styles.scoreMedium;
  return styles.scoreLow;
}

function getRecommendationInfo(rec: Recommendation | null): { label: string; className: string } {
  switch (rec) {
    case 'strong_hire': return { label: 'Strong Hire', className: styles.recStrongHire };
    case 'hire': return { label: 'Hire', className: styles.recHire };
    case 'lean_hire': return { label: 'Lean Hire', className: styles.recLeanHire };
    case 'lean_no_hire': return { label: 'Lean No Hire', className: styles.recLeanNoHire };
    case 'no_hire': return { label: 'No Hire', className: styles.recNoHire };
    default: return { label: rec || 'Unknown', className: '' };
  }
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

// =============================================================================
// Component
// =============================================================================

export default function AssessmentHistory({ studentId, studentName }: AssessmentHistoryProps) {
  const [supabase] = useState(() => createClient(supabaseUrl, supabaseAnonKey));
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // Fetch assessments
  const fetchAssessments = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('interview_assessments')
        .select('*')
        .eq('student_id', studentId)
        .order('interview_date', { ascending: false });

      if (error) throw error;
      setAssessments(data || []);
    } catch (err) {
      console.error('Error fetching assessments:', err);
    } finally {
      setLoading(false);
    }
  }, [supabase, studentId]);

  useEffect(() => {
    fetchAssessments();
  }, [fetchAssessments]);

  // Toggle expanded
  const toggleExpanded = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Delete assessment
  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('interview_assessments')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setAssessments(prev => prev.filter(a => a.id !== id));
      setDeleteConfirm(null);
    } catch (err) {
      console.error('Error deleting assessment:', err);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading assessments...</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <h3>Assessment History</h3>
          <p className={styles.count}>
            {assessments.length} assessment{assessments.length !== 1 ? 's' : ''} completed
          </p>
        </div>
      </div>

      {/* Empty State */}
      {assessments.length === 0 ? (
        <div className={styles.emptyState}>
          <span className={styles.emptyIcon}>📋</span>
          <h4>No assessments completed yet</h4>
          <p>This student has not been assessed.</p>
        </div>
      ) : (
        /* Assessment List */
        <div className={styles.list}>
          {assessments.map(assessment => (
            <AssessmentCard
              key={assessment.id}
              assessment={assessment}
              isExpanded={expandedIds.has(assessment.id)}
              onToggle={() => toggleExpanded(assessment.id)}
              onDelete={() => setDeleteConfirm(assessment.id)}
              deleteConfirm={deleteConfirm === assessment.id}
              onConfirmDelete={() => handleDelete(assessment.id)}
              onCancelDelete={() => setDeleteConfirm(null)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Assessment Card Component
// =============================================================================

interface AssessmentCardProps {
  assessment: Assessment;
  isExpanded: boolean;
  onToggle: () => void;
  onDelete: () => void;
  deleteConfirm: boolean;
  onConfirmDelete: () => void;
  onCancelDelete: () => void;
}

function AssessmentCard({
  assessment,
  isExpanded,
  onToggle,
  onDelete,
  deleteConfirm,
  onConfirmDelete,
  onCancelDelete,
}: AssessmentCardProps) {
  const totalScore = parseFloat(assessment.total_score || '0');
  const recInfo = getRecommendationInfo(assessment.recommendation);
  
  // Get individual scores for display
  const scores = [
    { label: 'Problem Solving', value: assessment.problem_solving },
    { label: 'Code Quality', value: assessment.code_quality },
    { label: 'Technical Knowledge', value: assessment.technical_knowledge },
    { label: 'Debugging', value: assessment.debugging_ability },
    { label: 'Communication', value: assessment.communication_skills },
    { label: 'Problem Approach', value: assessment.problem_approach },
    { label: 'Cultural Fit', value: assessment.cultural_fit },
  ].filter(s => s.value && s.value !== '0');

  return (
    <div className={styles.card}>
      {/* Card Header */}
      <div className={styles.cardHeader} onClick={onToggle}>
        <div className={styles.cardLeft}>
          <span className={styles.date}>{formatDate(assessment.interview_date)}</span>
          <span className={`${styles.recommendation} ${recInfo.className}`}>
            {recInfo.label}
          </span>
        </div>
        <div className={styles.cardRight}>
          <span className={`${styles.score} ${getScoreColor(totalScore)}`}>
            {Math.round(totalScore)}/100
          </span>
          <span className={styles.expandIcon}>{isExpanded ? '▼' : '▶'}</span>
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className={styles.cardBody}>
          {/* Score Breakdown */}
          {scores.length > 0 && (
            <div className={styles.section}>
              <h5>Score Breakdown</h5>
              <div className={styles.scoresGrid}>
                {scores.map(({ label, value }) => (
                  <div key={label} className={styles.scoreItem}>
                    <span className={styles.scoreLabel}>{label}</span>
                    <span className={styles.scoreValue}>{value}/10</span>
                  </div>
                ))}
                {assessment.bonus_points && parseFloat(assessment.bonus_points) > 0 && (
                  <div className={styles.scoreItem}>
                    <span className={styles.scoreLabel}>Bonus Points</span>
                    <span className={styles.scoreValue}>+{assessment.bonus_points}</span>
                  </div>
                )}
              </div>
              <div className={styles.totalRow}>
                <span>Technical Total: {assessment.technical_total || '—'}</span>
                <span>Behavioral Total: {assessment.behavioral_total || '—'}</span>
              </div>
            </div>
          )}

          {/* Bonus Reason */}
          {assessment.bonus_reason && (
            <div className={styles.section}>
              <h5>Bonus Reason</h5>
              <p className={styles.feedbackText}>{assessment.bonus_reason}</p>
            </div>
          )}

          {/* Strengths */}
          {assessment.strengths && (
            <div className={styles.section}>
              <h5>Strengths</h5>
              <p className={styles.feedbackText}>{assessment.strengths}</p>
            </div>
          )}

          {/* Areas for Improvement */}
          {assessment.areas_for_improvement && (
            <div className={styles.section}>
              <h5>Areas for Improvement</h5>
              <p className={styles.feedbackText}>{assessment.areas_for_improvement}</p>
            </div>
          )}

          {/* Internal Notes */}
          {assessment.internal_notes && (
            <div className={styles.section}>
              <h5>Internal Notes</h5>
              <p className={styles.notesText}>{assessment.internal_notes}</p>
            </div>
          )}

          {/* Actions */}
          <div className={styles.cardActions}>
            {deleteConfirm ? (
              <div className={styles.confirmDelete}>
                <span>Delete this assessment?</span>
                <button className={styles.confirmYes} onClick={onConfirmDelete}>Yes, Delete</button>
                <button className={styles.confirmNo} onClick={onCancelDelete}>Cancel</button>
              </div>
            ) : (
              <button className={styles.deleteButton} onClick={onDelete}>
                🗑 Delete
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

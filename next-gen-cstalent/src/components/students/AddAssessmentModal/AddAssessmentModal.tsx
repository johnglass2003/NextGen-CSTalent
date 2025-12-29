/**
 * AddAssessmentModal
 * Modal form for adding new assessments to a student
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import { 
  ASSESSMENT_TYPES, 
  RECOMMENDATIONS, 
  INTERVIEWERS, 
  FOLLOW_UP_OPTIONS,
  type AssessmentType,
  type Recommendation 
} from '@/types/assessment';
import styles from './AddAssessmentModal.module.css';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// =============================================================================
// Types
// =============================================================================

interface FormData {
  assessmentType: AssessmentType;
  date: string;
  interviewerName: string;
  duration: string;
  score: string;
  skillsAssessed: string[];
  strengths: string;
  growthAreas: string;
  notes: string;
  recommendation: Recommendation | '';
  followUpActions: string[];
  internalNotes: string;
}

interface FormErrors {
  [key: string]: string;
}

interface AddAssessmentModalProps {
  isOpen: boolean;
  studentId: string;
  studentName: string;
  onClose: () => void;
  onSuccess: () => void;
}

// =============================================================================
// Constants
// =============================================================================

const SKILLS = [
  'Python',
  'Java',
  'JavaScript',
  'TypeScript',
  'React',
  'Node.js',
  'SQL',
  'System Design',
  'Data Structures',
  'Algorithms',
  'AWS',
  'Docker',
];

const initialFormData: FormData = {
  assessmentType: 'Technical Interview',
  date: new Date().toISOString().split('T')[0],
  interviewerName: '',
  duration: '',
  score: '',
  skillsAssessed: [],
  strengths: '',
  growthAreas: '',
  notes: '',
  recommendation: '',
  followUpActions: [],
  internalNotes: '',
};

// =============================================================================
// Component
// =============================================================================

export default function AddAssessmentModal({ 
  isOpen, 
  studentId, 
  studentName,
  onClose, 
  onSuccess 
}: AddAssessmentModalProps) {
  const [supabase] = useState(() => createClient(supabaseUrl, supabaseAnonKey));
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [errors, setErrors] = useState<FormErrors>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setFormData(initialFormData);
      setErrors({});
      setSaveError(null);
    }
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Validation
  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.date) newErrors.date = 'This field is required';
    if (!formData.interviewerName) newErrors.interviewerName = 'This field is required';
    if (!formData.score) {
      newErrors.score = 'This field is required';
    } else {
      const scoreNum = parseFloat(formData.score);
      if (isNaN(scoreNum) || scoreNum < 0 || scoreNum > 10) {
        newErrors.score = 'Score must be between 0 and 10';
      }
    }
    if (!formData.recommendation) newErrors.recommendation = 'This field is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle input change
  const handleChange = (field: keyof FormData, value: string | string[]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  // Handle skill toggle
  const handleSkillToggle = (skill: string) => {
    const newSkills = formData.skillsAssessed.includes(skill)
      ? formData.skillsAssessed.filter(s => s !== skill)
      : [...formData.skillsAssessed, skill];
    handleChange('skillsAssessed', newSkills);
  };

  // Handle follow-up toggle
  const handleFollowUpToggle = (action: string) => {
    const newActions = formData.followUpActions.includes(action)
      ? formData.followUpActions.filter(a => a !== action)
      : [...formData.followUpActions, action];
    handleChange('followUpActions', newActions);
  };

  // Handle submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setSaving(true);
    setSaveError(null);

    try {
      const assessmentData = {
        student_id: studentId,
        assessment_type: formData.assessmentType,
        interview_date: formData.date,
        interviewer_name: formData.interviewerName,
        duration: formData.duration ? parseInt(formData.duration, 10) : null,
        score: parseFloat(formData.score),
        skills_assessed: formData.skillsAssessed,
        strengths: formData.strengths || null,
        growth_areas: formData.growthAreas || null,
        notes: formData.notes || null,
        recommendation: formData.recommendation,
        follow_up_actions: formData.followUpActions,
        internal_notes: formData.internalNotes || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('interview_assessments')
        .insert(assessmentData);

      if (error) throw error;

      // Update student's last activity
      await supabase
        .from('students')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', studentId);

      onSuccess();
      onClose();
    } catch (err) {
      console.error('Error saving assessment:', err);
      setSaveError(err instanceof Error ? err.message : 'Failed to save assessment');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  const isValid = formData.date && formData.interviewerName && 
                  formData.score && formData.recommendation;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()} role="dialog" aria-modal="true">
        <header className={styles.header}>
          <div>
            <h2>Add New Assessment</h2>
            <p className={styles.studentName}>for {studentName}</p>
          </div>
          <button className={styles.closeButton} onClick={onClose} aria-label="Close modal">
            ✕
          </button>
        </header>

        <form onSubmit={handleSubmit} className={styles.form}>
          {/* Basic Info */}
          <div className={styles.section}>
            <div className={styles.row}>
              <div className={styles.field}>
                <label htmlFor="assessmentType">Assessment Type</label>
                <select
                  id="assessmentType"
                  value={formData.assessmentType}
                  onChange={e => handleChange('assessmentType', e.target.value as AssessmentType)}
                >
                  {ASSESSMENT_TYPES.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>
              <div className={styles.field}>
                <label htmlFor="date">Date Conducted *</label>
                <input
                  id="date"
                  type="date"
                  value={formData.date}
                  onChange={e => handleChange('date', e.target.value)}
                  className={errors.date ? styles.inputError : ''}
                />
                {errors.date && <span className={styles.error}>{errors.date}</span>}
              </div>
            </div>

            <div className={styles.row}>
              <div className={styles.field}>
                <label htmlFor="interviewerName">Interviewer *</label>
                <select
                  id="interviewerName"
                  value={formData.interviewerName}
                  onChange={e => handleChange('interviewerName', e.target.value)}
                  className={errors.interviewerName ? styles.inputError : ''}
                >
                  <option value="">Select interviewer...</option>
                  {INTERVIEWERS.map(name => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
                {errors.interviewerName && <span className={styles.error}>{errors.interviewerName}</span>}
              </div>
              <div className={styles.field}>
                <label htmlFor="duration">Duration (minutes)</label>
                <input
                  id="duration"
                  type="number"
                  value={formData.duration}
                  onChange={e => handleChange('duration', e.target.value)}
                  placeholder="45"
                  min="0"
                />
              </div>
            </div>
          </div>

          {/* Score */}
          <div className={styles.section}>
            <h3>Score & Recommendation</h3>
            <div className={styles.row}>
              <div className={styles.field}>
                <label htmlFor="score">Overall Score (0-10) *</label>
                <input
                  id="score"
                  type="number"
                  step="0.5"
                  min="0"
                  max="10"
                  value={formData.score}
                  onChange={e => handleChange('score', e.target.value)}
                  className={errors.score ? styles.inputError : ''}
                  placeholder="8.5"
                />
                {errors.score && <span className={styles.error}>{errors.score}</span>}
              </div>
              <div className={styles.field}>
                <label>Recommendation *</label>
                <div className={styles.radioGroup}>
                  {RECOMMENDATIONS.map(rec => (
                    <label key={rec.value} className={styles.radio}>
                      <input
                        type="radio"
                        name="recommendation"
                        value={rec.value}
                        checked={formData.recommendation === rec.value}
                        onChange={e => handleChange('recommendation', e.target.value as Recommendation)}
                      />
                      <span>{rec.label}</span>
                      <small>({rec.range})</small>
                    </label>
                  ))}
                </div>
                {errors.recommendation && <span className={styles.error}>{errors.recommendation}</span>}
              </div>
            </div>
          </div>

          {/* Skills */}
          <div className={styles.section}>
            <h3>Technical Skills Assessed</h3>
            <div className={styles.checkboxGroup}>
              {SKILLS.map(skill => (
                <label key={skill} className={styles.checkbox}>
                  <input
                    type="checkbox"
                    checked={formData.skillsAssessed.includes(skill)}
                    onChange={() => handleSkillToggle(skill)}
                  />
                  {skill}
                </label>
              ))}
            </div>
          </div>

          {/* Feedback */}
          <div className={styles.section}>
            <h3>Feedback</h3>
            <div className={styles.field}>
              <label htmlFor="strengths">Strengths</label>
              <textarea
                id="strengths"
                value={formData.strengths}
                onChange={e => handleChange('strengths', e.target.value)}
                placeholder="• Strong problem-solving abilities&#10;• Clean, readable code&#10;• Good communication"
                rows={3}
              />
            </div>
            <div className={styles.field}>
              <label htmlFor="growthAreas">Growth Areas</label>
              <textarea
                id="growthAreas"
                value={formData.growthAreas}
                onChange={e => handleChange('growthAreas', e.target.value)}
                placeholder="• Algorithm optimization&#10;• Time complexity analysis"
                rows={3}
              />
            </div>
            <div className={styles.field}>
              <label htmlFor="notes">Interview Notes</label>
              <textarea
                id="notes"
                value={formData.notes}
                onChange={e => handleChange('notes', e.target.value)}
                placeholder="Detailed notes from the interview..."
                rows={4}
              />
            </div>
          </div>

          {/* Follow-up */}
          <div className={styles.section}>
            <h3>Follow-up Actions</h3>
            <div className={styles.checkboxGroup}>
              {FOLLOW_UP_OPTIONS.map(action => (
                <label key={action} className={styles.checkbox}>
                  <input
                    type="checkbox"
                    checked={formData.followUpActions.includes(action)}
                    onChange={() => handleFollowUpToggle(action)}
                  />
                  {action}
                </label>
              ))}
            </div>
          </div>

          {/* Internal Notes */}
          <div className={styles.section}>
            <div className={styles.field}>
              <label htmlFor="internalNotes">Internal Notes (not shared with student)</label>
              <textarea
                id="internalNotes"
                value={formData.internalNotes}
                onChange={e => handleChange('internalNotes', e.target.value)}
                placeholder="Private notes for internal use only..."
                rows={2}
              />
            </div>
          </div>

          {/* Error */}
          {saveError && (
            <div className={styles.saveError}>{saveError}</div>
          )}

          {/* Actions */}
          <div className={styles.actions}>
            <button type="button" className={styles.cancelButton} onClick={onClose}>
              Cancel
            </button>
            <button 
              type="submit" 
              className={styles.submitButton}
              disabled={saving || !isValid}
            >
              {saving ? 'Saving...' : 'Save Assessment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

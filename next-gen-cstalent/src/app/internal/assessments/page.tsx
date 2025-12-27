/**
 * Internal Interview Assessment Page
 * Score student interviews with technical, behavioral, and bonus assessments
 */

'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import styles from './page.module.css';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Recommendation options
type Recommendation = 'strong_hire' | 'hire' | 'maybe' | 'no_hire';

const RECOMMENDATION_OPTIONS: { value: Recommendation; label: string }[] = [
  { value: 'strong_hire', label: 'Strong Hire' },
  { value: 'hire', label: 'Hire' },
  { value: 'maybe', label: 'Maybe' },
  { value: 'no_hire', label: 'No Hire' },
];

// Student interface for selection
interface StudentOption {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  major: string | null;
  graduation_year: number | null;
}

// Assessment scores interface
interface AssessmentScores {
  // Technical (50 max)
  problemSolving: number;
  codeQuality: number;
  technicalKnowledge: number;
  debuggingAbility: number;
  // Behavioral (30 max)
  communicationSkills: number;
  problemApproach: number;
  culturalFit: number;
  // Bonus (20 max)
  bonusPoints: number;
  bonusReason: string;
}

// Form state interface
interface AssessmentForm {
  studentId: string;
  interviewDate: string;
  scores: AssessmentScores;
  strengths: string;
  areasForImprovement: string;
  internalNotes: string;
  recommendation: Recommendation | '';
}

const initialScores: AssessmentScores = {
  problemSolving: 0,
  codeQuality: 0,
  technicalKnowledge: 0,
  debuggingAbility: 0,
  communicationSkills: 0,
  problemApproach: 0,
  culturalFit: 0,
  bonusPoints: 0,
  bonusReason: '',
};

const initialForm: AssessmentForm = {
  studentId: '',
  interviewDate: new Date().toISOString().slice(0, 16),
  scores: { ...initialScores },
  strengths: '',
  areasForImprovement: '',
  internalNotes: '',
  recommendation: '',
};

export default function InternalAssessmentsPage() {
  return (
    <ProtectedRoute allowedRoles={['internal']}>
      <AssessmentForm />
    </ProtectedRoute>
  );
}

function AssessmentForm() {
  const { user } = useAuth();
  const [supabase] = useState(() => createClient(supabaseUrl, supabaseAnonKey));

  // State
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<StudentOption | null>(null);
  const [form, setForm] = useState<AssessmentForm>(initialForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loadingStudents, setLoadingStudents] = useState(false);

  // Calculate totals
  const technicalTotal = useMemo(() => {
    const { problemSolving, codeQuality, technicalKnowledge, debuggingAbility } = form.scores;
    return problemSolving + codeQuality + technicalKnowledge + debuggingAbility;
  }, [form.scores]);

  const behavioralTotal = useMemo(() => {
    const { communicationSkills, problemApproach, culturalFit } = form.scores;
    return communicationSkills + problemApproach + culturalFit;
  }, [form.scores]);

  const totalScore = useMemo(() => {
    return technicalTotal + behavioralTotal + form.scores.bonusPoints;
  }, [technicalTotal, behavioralTotal, form.scores.bonusPoints]);

  // Get score color class
  const getScoreColorClass = (score: number): string => {
    if (score >= 90) return styles.scoreExcellent;
    if (score >= 70) return styles.scoreGood;
    if (score >= 50) return styles.scoreFair;
    return styles.scoreNeedsWork;
  };

  // Search students
  const searchStudents = useCallback(async (query: string) => {
    if (query.length < 2) {
      setStudents([]);
      return;
    }

    setLoadingStudents(true);
    try {
      const { data, error } = await supabase
        .from('students')
        .select('id, first_name, last_name, email, major, graduation_year')
        .or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%,email.ilike.%${query}%`)
        .limit(10);

      if (error) throw error;
      setStudents(data || []);
    } catch (err) {
      console.error('Error searching students:', err);
    } finally {
      setLoadingStudents(false);
    }
  }, [supabase]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      searchStudents(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, searchStudents]);

  // Handle student selection
  const handleSelectStudent = (student: StudentOption) => {
    setSelectedStudent(student);
    setForm((prev) => ({ ...prev, studentId: student.id }));
    setSearchQuery(`${student.first_name} ${student.last_name}`);
    setShowDropdown(false);
  };

  // Handle score change
  const handleScoreChange = (field: keyof AssessmentScores, value: number | string) => {
    setForm((prev) => ({
      ...prev,
      scores: {
        ...prev.scores,
        [field]: typeof value === 'string' ? value : Math.max(0, value),
      },
    }));
  };

  // Handle form field change
  const handleFieldChange = (field: keyof AssessmentForm, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  // Validate form
  const validateForm = (): string | null => {
    if (!form.studentId) {
      return 'Please select a student';
    }
    if (!form.interviewDate) {
      return 'Please enter the interview date';
    }
    if (!form.strengths && !form.areasForImprovement) {
      return 'Please fill in at least strengths or areas for improvement';
    }
    if (!form.recommendation) {
      return 'Please select a recommendation';
    }
    return null;
  };

  // Save assessment
  const handleSave = async (updateStatus?: 'vetted' | 'not_accepted') => {
    // Validate
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    // Confirm if marking as not accepted
    if (updateStatus === 'not_accepted') {
      const confirmed = window.confirm(
        'Are you sure you want to mark this student as Not Accepted? This will update their profile status.'
      );
      if (!confirmed) return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      // Get interviewer's user record ID
      let interviewerId = user?.id;

      // Insert assessment
      const assessmentData = {
        student_id: form.studentId,
        interviewer_id: interviewerId,
        interview_date: form.interviewDate,
        // Technical scores
        problem_solving: form.scores.problemSolving,
        code_quality: form.scores.codeQuality,
        technical_knowledge: form.scores.technicalKnowledge,
        debugging_ability: form.scores.debuggingAbility,
        technical_total: technicalTotal,
        // Behavioral scores
        communication_skills: form.scores.communicationSkills,
        problem_approach: form.scores.problemApproach,
        cultural_fit: form.scores.culturalFit,
        behavioral_total: behavioralTotal,
        // Bonus
        bonus_points: form.scores.bonusPoints,
        bonus_reason: form.scores.bonusReason || null,
        // Total
        total_score: totalScore,
        // Feedback
        strengths: form.strengths || null,
        areas_for_improvement: form.areasForImprovement || null,
        internal_notes: form.internalNotes || null,
        recommendation: form.recommendation,
      };

      const { error: insertError } = await supabase
        .from('interview_assessments')
        .insert(assessmentData);

      if (insertError) {
        throw new Error(`Failed to save assessment: ${insertError.message}`);
      }

      // Update student status if requested
      if (updateStatus) {
        const studentUpdate: Record<string, unknown> = {
          vetting_status: updateStatus,
          overall_score: totalScore,
        };

        // Add feedback for vetted students
        if (form.areasForImprovement) {
          studentUpdate.feedback = form.areasForImprovement;
        }

        const { error: updateError } = await supabase
          .from('students')
          .update(studentUpdate)
          .eq('id', form.studentId);

        if (updateError) {
          throw new Error(`Assessment saved but failed to update student status: ${updateError.message}`);
        }
      }

      // Success
      const statusMessage = updateStatus
        ? ` Student status updated to ${updateStatus === 'vetted' ? 'Vetted' : 'Not Accepted'}.`
        : '';
      setSuccess(`Assessment saved successfully!${statusMessage}`);

      // Reset form
      setForm(initialForm);
      setSelectedStudent(null);
      setSearchQuery('');
    } catch (err) {
      console.error('Error saving assessment:', err);
      setError(err instanceof Error ? err.message : 'Failed to save assessment');
    } finally {
      setSaving(false);
    }
  };

  // Clear form
  const handleClearForm = () => {
    setForm(initialForm);
    setSelectedStudent(null);
    setSearchQuery('');
    setError(null);
    setSuccess(null);
  };

  return (
    <div className={styles.container}>
      {/* Page Header */}
      <header className={styles.header}>
        <h1 className={styles.title}>Interview Assessment</h1>
        <p className={styles.subtitle}>Score and evaluate student interviews</p>
      </header>

      {/* Total Score Banner */}
      <div className={`${styles.scoreBanner} ${getScoreColorClass(totalScore)}`}>
        <div className={styles.scoreBannerContent}>
          <span className={styles.scoreBannerLabel}>Total Score</span>
          <span className={styles.scoreBannerValue}>{totalScore}</span>
          <span className={styles.scoreBannerMax}>/ 100</span>
        </div>
        <div className={styles.scoreBannerBreakdown}>
          <span>Technical: {technicalTotal}/50</span>
          <span>Behavioral: {behavioralTotal}/30</span>
          <span>Bonus: {form.scores.bonusPoints}/20</span>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className={styles.errorMessage}>
          <span>⚠️</span> {error}
        </div>
      )}
      {success && (
        <div className={styles.successMessage}>
          <span>✓</span> {success}
          <button onClick={handleClearForm} className={styles.assessAnotherButton}>
            Assess Another Student
          </button>
        </div>
      )}

      <form className={styles.form} onSubmit={(e) => e.preventDefault()}>
        {/* Student Selection */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Student Information</h2>
          
          <div className={styles.fieldGroup}>
            <label className={styles.label}>Select Student *</label>
            <div className={styles.studentSearchContainer}>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowDropdown(true);
                }}
                onFocus={() => setShowDropdown(true)}
                placeholder="Search by name or email..."
                className={styles.searchInput}
              />
              {showDropdown && (searchQuery.length >= 2 || students.length > 0) && (
                <div className={styles.dropdown}>
                  {loadingStudents ? (
                    <div className={styles.dropdownLoading}>Searching...</div>
                  ) : students.length > 0 ? (
                    students.map((student) => (
                      <button
                        key={student.id}
                        type="button"
                        onClick={() => handleSelectStudent(student)}
                        className={styles.dropdownItem}
                      >
                        <span className={styles.dropdownName}>
                          {student.first_name} {student.last_name}
                        </span>
                        <span className={styles.dropdownEmail}>{student.email}</span>
                      </button>
                    ))
                  ) : searchQuery.length >= 2 ? (
                    <div className={styles.dropdownEmpty}>No students found</div>
                  ) : null}
                </div>
              )}
            </div>
          </div>

          {selectedStudent && (
            <div className={styles.selectedStudentCard}>
              <div className={styles.selectedStudentInfo}>
                <h3>{selectedStudent.first_name} {selectedStudent.last_name}</h3>
                <p>{selectedStudent.email}</p>
                <p>
                  {selectedStudent.major || 'No major'} • Class of {selectedStudent.graduation_year || 'N/A'}
                </p>
              </div>
              <Link
                href={`/internal/students/${selectedStudent.id}`}
                className={styles.viewProfileLink}
                target="_blank"
              >
                View Profile →
              </Link>
            </div>
          )}

          <div className={styles.fieldGroup}>
            <label className={styles.label}>Interview Date & Time *</label>
            <input
              type="datetime-local"
              value={form.interviewDate}
              onChange={(e) => handleFieldChange('interviewDate', e.target.value)}
              className={styles.dateInput}
            />
          </div>
        </section>

        {/* Technical Assessment */}
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Technical Assessment</h2>
            <span className={styles.sectionTotal}>{technicalTotal} / 50</span>
          </div>

          <div className={styles.scoreGrid}>
            <ScoreSlider
              label="Problem Solving"
              value={form.scores.problemSolving}
              max={15}
              onChange={(v) => handleScoreChange('problemSolving', v)}
            />
            <ScoreSlider
              label="Code Quality"
              value={form.scores.codeQuality}
              max={15}
              onChange={(v) => handleScoreChange('codeQuality', v)}
            />
            <ScoreSlider
              label="Technical Knowledge"
              value={form.scores.technicalKnowledge}
              max={10}
              onChange={(v) => handleScoreChange('technicalKnowledge', v)}
            />
            <ScoreSlider
              label="Debugging Ability"
              value={form.scores.debuggingAbility}
              max={10}
              onChange={(v) => handleScoreChange('debuggingAbility', v)}
            />
          </div>
        </section>

        {/* Behavioral Assessment */}
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Behavioral Assessment</h2>
            <span className={styles.sectionTotal}>{behavioralTotal} / 30</span>
          </div>

          <div className={styles.scoreGrid}>
            <ScoreSlider
              label="Communication Skills"
              value={form.scores.communicationSkills}
              max={10}
              onChange={(v) => handleScoreChange('communicationSkills', v)}
            />
            <ScoreSlider
              label="Problem Approach"
              value={form.scores.problemApproach}
              max={10}
              onChange={(v) => handleScoreChange('problemApproach', v)}
            />
            <ScoreSlider
              label="Cultural Fit"
              value={form.scores.culturalFit}
              max={10}
              onChange={(v) => handleScoreChange('culturalFit', v)}
            />
          </div>
        </section>

        {/* Bonus Points */}
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Bonus Points</h2>
            <span className={styles.sectionTotal}>{form.scores.bonusPoints} / 20</span>
          </div>

          <div className={styles.bonusSection}>
            <div className={styles.fieldGroup}>
              <label className={styles.label}>Bonus Points (0-20)</label>
              <input
                type="number"
                min={0}
                max={20}
                value={form.scores.bonusPoints}
                onChange={(e) => handleScoreChange('bonusPoints', Math.min(20, Math.max(0, parseInt(e.target.value) || 0)))}
                className={styles.numberInput}
              />
            </div>
            <div className={styles.fieldGroup}>
              <label className={styles.label}>Reason for Bonus</label>
              <textarea
                value={form.scores.bonusReason}
                onChange={(e) => handleScoreChange('bonusReason', e.target.value)}
                placeholder="Explain why bonus points were given..."
                rows={2}
                className={styles.textarea}
              />
            </div>
          </div>
        </section>

        {/* Qualitative Feedback */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Qualitative Feedback</h2>

          <div className={styles.fieldGroup}>
            <label className={styles.label}>Strengths</label>
            <textarea
              value={form.strengths}
              onChange={(e) => handleFieldChange('strengths', e.target.value)}
              placeholder="What did the student do well?"
              rows={4}
              className={styles.textarea}
            />
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.label}>Areas for Improvement</label>
            <textarea
              value={form.areasForImprovement}
              onChange={(e) => handleFieldChange('areasForImprovement', e.target.value)}
              placeholder="What could the student improve on?"
              rows={4}
              className={styles.textarea}
            />
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.label}>
              Internal Notes
              <span className={styles.privateLabel}>Private - not shown to student</span>
            </label>
            <textarea
              value={form.internalNotes}
              onChange={(e) => handleFieldChange('internalNotes', e.target.value)}
              placeholder="Any additional notes for the team..."
              rows={3}
              className={styles.textarea}
            />
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.label}>Recommendation *</label>
            <div className={styles.radioGroup}>
              {RECOMMENDATION_OPTIONS.map((option) => (
                <label key={option.value} className={styles.radioLabel}>
                  <input
                    type="radio"
                    name="recommendation"
                    value={option.value}
                    checked={form.recommendation === option.value}
                    onChange={(e) => handleFieldChange('recommendation', e.target.value)}
                    className={styles.radioInput}
                  />
                  <span className={`${styles.radioButton} ${form.recommendation === option.value ? styles.radioButtonSelected : ''}`}>
                    {option.label}
                  </span>
                </label>
              ))}
            </div>
          </div>
        </section>

        {/* Actions */}
        <div className={styles.actions}>
          <button
            type="button"
            onClick={() => handleSave()}
            disabled={saving}
            className={styles.saveButton}
          >
            {saving ? 'Saving...' : 'Save Assessment'}
          </button>
          <button
            type="button"
            onClick={() => handleSave('vetted')}
            disabled={saving || form.recommendation === 'no_hire'}
            className={styles.saveVettedButton}
          >
            {saving ? 'Saving...' : 'Save & Update Status to Vetted'}
          </button>
          {form.recommendation === 'no_hire' && (
            <button
              type="button"
              onClick={() => handleSave('not_accepted')}
              disabled={saving}
              className={styles.saveNotAcceptedButton}
            >
              {saving ? 'Saving...' : 'Save & Mark as Not Accepted'}
            </button>
          )}
          <button
            type="button"
            onClick={handleClearForm}
            disabled={saving}
            className={styles.clearButton}
          >
            Clear Form
          </button>
        </div>
      </form>
    </div>
  );
}

// Score Slider Component
interface ScoreSliderProps {
  label: string;
  value: number;
  max: number;
  onChange: (value: number) => void;
}

function ScoreSlider({ label, value, max, onChange }: ScoreSliderProps) {
  const percentage = (value / max) * 100;

  return (
    <div className={styles.sliderContainer}>
      <div className={styles.sliderHeader}>
        <label className={styles.sliderLabel}>{label}</label>
        <span className={styles.sliderValue}>
          {value} / {max}
        </span>
      </div>
      <div className={styles.sliderWrapper}>
        <input
          type="range"
          min={0}
          max={max}
          value={value}
          onChange={(e) => onChange(parseInt(e.target.value, 10))}
          className={styles.slider}
          style={{ '--slider-percentage': `${percentage}%` } as React.CSSProperties}
        />
      </div>
    </div>
  );
}

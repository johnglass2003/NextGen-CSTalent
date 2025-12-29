/**
 * Assessment Types
 * Type definitions for student assessments
 * Based on actual interview_assessments table schema
 */

// Recommendation values from the database
export type Recommendation = 
  | 'strong_hire' 
  | 'hire' 
  | 'lean_hire'
  | 'lean_no_hire'
  | 'no_hire';

// Assessment type values
export type AssessmentType = 
  | 'technical'
  | 'behavioral'
  | 'system_design'
  | 'coding'
  | 'final';

// Assessment types for dropdown
export const ASSESSMENT_TYPES: { value: AssessmentType; label: string }[] = [
  { value: 'technical', label: 'Technical Interview' },
  { value: 'behavioral', label: 'Behavioral Interview' },
  { value: 'system_design', label: 'System Design' },
  { value: 'coding', label: 'Coding Challenge' },
  { value: 'final', label: 'Final Round' },
];

// Follow-up action options
export const FOLLOW_UP_OPTIONS = [
  'Schedule follow-up interview',
  'Send additional resources',
  'Review with team',
  'Extend offer',
  'Send rejection',
  'Request references',
];

// Assessment interface matching actual DB schema
export interface Assessment {
  id: string;
  student_id: string;
  interviewer_id: string | null;
  interviewer_name: string | null;
  interview_date: string;
  
  // Individual scores
  problem_solving: string | null;
  problem_solving_score: string | null;
  code_quality: string | null;
  code_quality_score: string | null;
  technical_knowledge: string | null;
  technical_knowledge_score: string | null;
  debugging_ability: string | null;
  debugging_ability_score: string | null;
  communication_skills: string | null;
  communication_score: string | null;
  problem_approach: string | null;
  problem_approach_score: string | null;
  cultural_fit: string | null;
  cultural_fit_score: string | null;
  
  // Bonus
  bonus_points: string | null;
  bonus_reason: string | null;
  
  // Totals
  technical_total: string | null;
  behavioral_total: string | null;
  total_score: string | null;
  
  // Feedback
  strengths: string | null;
  areas_for_improvement: string | null;
  internal_notes: string | null;
  recommendation: Recommendation | null;
  
  created_at: string;
  updated_at: string;
}

// Constants for recommendation display
export const RECOMMENDATIONS: { value: Recommendation; label: string; color: string }[] = [
  { value: 'strong_hire', label: 'Strong Hire', color: 'green' },
  { value: 'hire', label: 'Hire', color: 'lightgreen' },
  { value: 'lean_hire', label: 'Lean Hire', color: 'yellow' },
  { value: 'lean_no_hire', label: 'Lean No Hire', color: 'orange' },
  { value: 'no_hire', label: 'No Hire', color: 'red' },
];

export const INTERVIEWERS = [
  'Alex Foster',
  'Sarah Martinez', 
  'Jordan Patel',
];

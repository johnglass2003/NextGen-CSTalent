/**
 * Company Candidate Types
 * Type definitions for company-facing candidate management
 */

// Candidate status flow
export type CandidateStatus =
  | 'new'              // Just presented, not yet reviewed
  | 'reviewing'        // Company is reviewing
  | 'interested'       // Company marked interested
  | 'interview_scheduled'
  | 'interviewed'
  | 'offer_extended'
  | 'offer_accepted'
  | 'hired'
  | 'not_a_fit'        // Rejected
  | 'on_hold';

// Status display configuration
export const CANDIDATE_STATUS_CONFIG: Record<CandidateStatus, { 
  label: string; 
  colorClass: string;
  icon: string;
}> = {
  new: { label: 'New', colorClass: 'statusNew', icon: '✨' },
  reviewing: { label: 'Reviewing', colorClass: 'statusReviewing', icon: '👁️' },
  interested: { label: 'Interested', colorClass: 'statusInterested', icon: '👍' },
  interview_scheduled: { label: 'Interview Scheduled', colorClass: 'statusScheduled', icon: '📅' },
  interviewed: { label: 'Interviewed', colorClass: 'statusInterviewed', icon: '✅' },
  offer_extended: { label: 'Offer Extended', colorClass: 'statusOffer', icon: '📄' },
  offer_accepted: { label: 'Offer Accepted', colorClass: 'statusAccepted', icon: '🎉' },
  hired: { label: 'Hired', colorClass: 'statusHired', icon: '🏆' },
  not_a_fit: { label: 'Not a Fit', colorClass: 'statusRejected', icon: '✗' },
  on_hold: { label: 'On Hold', colorClass: 'statusHold', icon: '⏸️' },
};

// Interview type options
export type InterviewType = 
  | 'phone_screen'
  | 'video'
  | 'technical'
  | 'onsite'
  | 'panel'
  | 'final';

export const INTERVIEW_TYPE_CONFIG: Record<InterviewType, { label: string }> = {
  phone_screen: { label: 'Phone Screen' },
  video: { label: 'Video Call' },
  technical: { label: 'Technical Interview' },
  onsite: { label: 'On-site' },
  panel: { label: 'Panel Interview' },
  final: { label: 'Final Round' },
};

// Rejection reasons
export type RejectionReason =
  | 'technical_mismatch'
  | 'experience_level'
  | 'location_preference'
  | 'salary_expectations'
  | 'timeline_mismatch'
  | 'culture_fit'
  | 'position_filled'
  | 'other';

export const REJECTION_REASONS: { value: RejectionReason; label: string }[] = [
  { value: 'technical_mismatch', label: 'Technical skills mismatch' },
  { value: 'experience_level', label: 'Experience level (over/under qualified)' },
  { value: 'location_preference', label: 'Location/remote preference' },
  { value: 'salary_expectations', label: 'Salary expectations' },
  { value: 'timeline_mismatch', label: 'Timeline mismatch' },
  { value: 'culture_fit', label: 'Culture fit concerns' },
  { value: 'position_filled', label: 'Position filled' },
  { value: 'other', label: 'Other' },
];

// Student info (what company sees)
export interface CandidateStudent {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string | null;
  major: string | null;
  graduation_year: number | null;
  gpa: number | null;
  location: string | null;
  technical_skills: string[];
  overall_score: number | null;
  resume_url: string | null;
  linkedin_url: string | null;
  github_url: string | null;
  portfolio_url: string | null;
  profile_photo_url: string | null;
  work_preferences: WorkPreferences | null;
}

export interface WorkPreferences {
  preferred_locations: string[];
  remote_flexibility: 'remote_only' | 'hybrid' | 'onsite_only' | 'flexible';
  desired_start_date: string | null;
  job_type_preferences: ('full_time' | 'internship' | 'contract' | 'part_time')[];
  salary_expectation_min: number | null;
  salary_expectation_max: number | null;
}

// Assessment results (sanitized for company view)
export interface CandidateAssessment {
  id: string;
  interview_date: string;
  total_score: number; // 0-100
  technical_total: number;
  behavioral_total: number;
  problem_solving: number;
  code_quality: number;
  technical_knowledge: number;
  communication_skills: number;
  strengths: string | null;
  recommendation: 'strong_hire' | 'hire' | 'lean_hire' | 'lean_no_hire' | 'no_hire';
  interviewer_notes_sanitized: string | null; // Cleaned for company view
  skills_validated: string[];
}

// Interview record (with this company)
export interface CandidateInterview {
  id: string;
  interview_type: InterviewType;
  scheduled_date: string;
  duration_minutes: number;
  interviewers: string[];
  meeting_link: string | null;
  location: string | null;
  status: 'scheduled' | 'completed' | 'cancelled' | 'no_show';
  focus_areas: string[];
  company_rating: number | null; // 1-5 stars
  company_feedback: string | null;
  created_at: string;
}

// Activity timeline event
export interface CandidateActivity {
  id: string;
  event_type: 'presented' | 'status_change' | 'interview_scheduled' | 'interview_completed' | 'offer_sent' | 'message' | 'note_added';
  description: string;
  created_at: string;
  created_by: string | null;
  metadata: Record<string, unknown> | null;
}

// Message between company and TalentBridge
export interface CandidateMessage {
  id: string;
  sender_type: 'company' | 'talentbridge';
  sender_name: string;
  message: string;
  created_at: string;
  is_read: boolean;
}

// Company internal note
export interface CandidateNote {
  id: string;
  note: string;
  created_at: string;
  created_by: string;
}

// Offer details
export interface OfferDetails {
  position_title: string;
  offer_amount: number;
  start_date: string;
  employment_type: 'full_time' | 'contract' | 'internship' | 'part_time';
  benefits_summary: string | null;
  expiration_date: string;
  additional_details: string | null;
  created_at: string;
  status: 'pending' | 'accepted' | 'declined' | 'expired';
}

// Main candidate interface
export interface CompanyCandidate {
  id: string;
  company_id: string;
  student_id: string;
  position_id: string | null;
  position_title: string | null;
  status: CandidateStatus;
  match_score: number | null; // 0-10
  match_reasons: string[];
  presented_date: string;
  last_activity_date: string;
  student: CandidateStudent;
  assessment: CandidateAssessment | null;
  interviews: CandidateInterview[];
  activities: CandidateActivity[];
  messages: CandidateMessage[];
  notes: CandidateNote[];
  offer: OfferDetails | null;
}

// Position/Job requirement
export interface CompanyPosition {
  id: string;
  position_title: string;
  department: string | null;
  status: 'active' | 'paused' | 'filled' | 'closed';
  candidate_count: number;
}

// Company info
export interface CandidateCompany {
  id: string;
  company_name: string;
  subscription_tier: 'starter' | 'growth' | 'enterprise';
  candidates_sent_this_month: number;
  max_candidates_per_month: number;
}

// Stats for dashboard
export interface CandidateStats {
  total: number;
  pending_review: number; // new + reviewing
  in_interview: number;   // interview_scheduled + interviewed
  offers_extended: number;
  hired: number;
}

// Filter options
export interface CandidateFilters {
  status: CandidateStatus | '';
  position_id: string;
  date_from: string;
  date_to: string;
  search: string;
}

// Sort options
export type CandidateSortOption = 
  | 'most_recent'
  | 'name_asc'
  | 'name_desc'
  | 'graduation_date'
  | 'match_score';

// Form data for modals
export interface InterestedFormData {
  position_id: string | null;
  next_step: 'phone_screen' | 'technical_interview' | 'onsite' | 'request_info';
  target_date: string;
  message: string;
}

export interface ScheduleInterviewFormData {
  interview_type: InterviewType;
  date_time: string;
  duration: number; // minutes
  interviewers: string;
  location_or_link: string;
  send_calendar_invite: boolean;
  focus_areas: string[];
  prep_notes: string;
}

export interface NotAFitFormData {
  reasons: RejectionReason[];
  additional_feedback: string;
  share_feedback: boolean;
}

export interface ExtendOfferFormData {
  position_title: string;
  offer_amount: number;
  start_date: string;
  employment_type: 'full_time' | 'contract' | 'internship' | 'part_time';
  benefits_summary: string;
  expiration_date: string;
  additional_details: string;
}

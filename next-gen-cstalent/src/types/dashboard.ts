/**
 * Dashboard Types
 * Type definitions for student dashboard data
 */

export type VettingStatus = 
  | 'pending_review'
  | 'interview_scheduled'
  | 'vetted'
  | 'not_accepted';

export interface StudentDashboardData {
  firstName: string;
  vettingStatus: VettingStatus;
  interviewDate: string | null;
  overallScore: number | null;
  feedback: string | null;
}

export interface DashboardStats {
  companiesInterestedIn: number;
  profilesSent: number;
  interviewsScheduled: number;
}

export interface ActivityItem {
  id: string;
  type: 'profile_sent' | 'interested' | 'interview_scheduled' | 'status_update';
  companyName: string;
  date: string;
  status: string;
}

export interface InterviewFeedback {
  strengths: string | null;
  areasForImprovement: string | null;
}

export interface DashboardData {
  student: StudentDashboardData | null;
  stats: DashboardStats;
  recentActivity: ActivityItem[];
  feedback: InterviewFeedback | null;
}

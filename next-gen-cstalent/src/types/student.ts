/**
 * Student Types
 * Type definitions for student-related data
 */

export interface StudentRegistration {
  firstName: string;
  lastName: string;
  email: string;
  major: string;
  graduationYear: string;
  gpa: string;
  linkedInUrl: string;
  skills: string[];
  locationPreferences: string[];
}

export interface Student extends StudentRegistration {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  status: StudentStatus;
  assessmentScore?: number;
  assessmentDate?: Date;
}

export type StudentStatus = 
  | 'pending'
  | 'assessed'
  | 'approved'
  | 'rejected'
  | 'matched';

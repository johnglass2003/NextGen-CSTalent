/**
 * Skills Constants
 * Technical skills and majors for student registration
 */

export const TECHNICAL_SKILLS = [
  'JavaScript',
  'TypeScript',
  'Python',
  'Java',
  'C++',
  'C',
  'React',
  'Next.js',
  'Node.js',
  'Express',
  'PostgreSQL',
  'MongoDB',
  'AWS',
  'Docker',
  'Git',
  'Machine Learning',
  'Data Analysis',
  'System Design',
] as const;

export const UF_MAJORS = [
  'Computer Science',
  'Computer Engineering',
  'Electrical Engineering',
  'Mechanical Engineering',
  'Aerospace Engineering',
  'Civil Engineering',
  'Chemical Engineering',
  'Industrial Engineering',
  'Biomedical Engineering',
  'Materials Science Engineering',
  'Data Science',
  'Digital Arts & Sciences',
] as const;

export const LOCATION_PREFERENCES = [
  'Remote',
  'Florida',
  'California',
  'Texas',
  'New York',
  'Washington',
  'Georgia',
  'Open to Relocation',
] as const;

export type TechnicalSkill = typeof TECHNICAL_SKILLS[number];
export type UFMajor = typeof UF_MAJORS[number];
export type LocationPreference = typeof LOCATION_PREFERENCES[number];

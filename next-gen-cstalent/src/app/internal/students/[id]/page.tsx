
'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/auth-helpers-nextjs';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import styles from './student-detail.module.css';

type Student = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  university: string | null;
  major: string | null;
  graduation_year: number | null;
  gpa: number | null;
  resume_url: string | null;
  linkedin_url: string | null;
  github_url: string | null;
  portfolio_url: string | null;
  skills: string[] | null;
  bio: string | null;
  location: string | null;
  work_authorization: string | null;
  willing_to_relocate: boolean | null;
  created_at: string;
  updated_at: string;
};

export default function StudentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const studentId = params.id as string;

  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);

  useEffect(() => {
    fetchStudentData();
  }, [studentId]);

  async function fetchStudentData() {
    try {
      setLoading(true);

      // Fetch student profile
      const { data: studentData, error: studentError } = await supabase
        .from('students')
        .select('*')
        .eq('id', studentId)
        .single();

      if (studentError) {
        throw new Error(`Student not found: ${studentError.message}`);
      }

      setStudent(studentData);
      setLoading(false);

    } catch (err: any) {
      console.error('Error fetching student:', err);
      setError(err.message);
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <ProtectedRoute allowedRoles={['internal']}>
        <div className={styles.container}>
          <div className={styles.loading}>Loading student profile...</div>
        </div>
      </ProtectedRoute>
    );
  }

  if (error || !student) {
    return (
      <ProtectedRoute allowedRoles={['internal']}>
        <div className={styles.container}>
          <div className={styles.error}>
            <h2>Error</h2>
            <p>{error || 'Student not found'}</p>
            <button onClick={() => router.push('/internal/students')} className={styles.backButton}>
              ← Back to Students
            </button>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute allowedRoles={['internal']}>
      <div className={styles.container}>
        {/* Header with Back Button */}
        <div className={styles.header}>
          <button onClick={() => router.push('/internal/students')} className={styles.backButton}>
            ← Back to Students
          </button>
          <h1>Student Profile</h1>
        </div>

        <div className={styles.profileLayout}>
          {/* Left Column: Main Info */}
          <div className={styles.mainColumn}>
            {/* Profile Card */}
            <div className={styles.card}>
              <div className={styles.profileHeader}>
                <div className={styles.avatar}>
                  {student.first_name[0]}{student.last_name[0]}
                </div>
                <div className={styles.profileInfo}>
                  <h2>{student.first_name} {student.last_name}</h2>
                  <p className={styles.subtitle}>
                    {student.major && student.university
                      ? `${student.major} at ${student.university}`
                      : student.university || 'Student'}
                  </p>
                  {student.location && (
                    <p className={styles.location}>📍 {student.location}</p>
                  )}
                </div>
              </div>

              {student.bio && (
                <div className={styles.section}>
                  <h3>About</h3>
                  <p className={styles.bio}>{student.bio}</p>
                </div>
              )}
            </div>

            {/* Skills */}
            {student.skills && student.skills.length > 0 && (
              <div className={styles.card}>
                <h3>Skills</h3>
                <div className={styles.skillsList}>
                  {student.skills.map((skill, idx) => (
                    <span key={idx} className={styles.skillBadge}>
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Contact & Details */}
          <div className={styles.sidebar}>
            {/* Contact Information */}
            <div className={styles.card}>
              <h3>Contact Information</h3>
              <div className={styles.contactList}>
                <div className={styles.contactItem}>
                  <span className={styles.contactLabel}>Email</span>
                  <a href={`mailto:${student.email}`} className={styles.contactValue}>
                    {student.email}
                  </a>
                </div>
                {student.phone && (
                  <div className={styles.contactItem}>
                    <span className={styles.contactLabel}>Phone</span>
                    <a href={`tel:${student.phone}`} className={styles.contactValue}>
                      {student.phone}
                    </a>
                  </div>
                )}
              </div>
            </div>

            {/* Links */}
            {(student.linkedin_url || student.github_url || student.portfolio_url || student.resume_url) && (
              <div className={styles.card}>
                <h3>Links</h3>
                <div className={styles.linksList}>
                  {student.linkedin_url && (
                    <a href={student.linkedin_url} target="_blank" rel="noopener noreferrer" className={styles.link}>
                      🔗 LinkedIn Profile
                    </a>
                  )}
                  {student.github_url && (
                    <a href={student.github_url} target="_blank" rel="noopener noreferrer" className={styles.link}>
                      💻 GitHub Profile
                    </a>
                  )}
                  {student.portfolio_url && (
                    <a href={student.portfolio_url} target="_blank" rel="noopener noreferrer" className={styles.link}>
                      🌐 Portfolio
                    </a>
                  )}
                  {student.resume_url && (
                    <a href={student.resume_url} target="_blank" rel="noopener noreferrer" className={styles.link}>
                      📄 Resume/CV
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* Academic Details */}
            <div className={styles.card}>
              <h3>Academic Details</h3>
              <div className={styles.detailsList}>
                {student.university && (
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>University</span>
                    <span className={styles.detailValue}>{student.university}</span>
                  </div>
                )}
                {student.major && (
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>Major</span>
                    <span className={styles.detailValue}>{student.major}</span>
                  </div>
                )}
                {student.graduation_year && (
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>Graduation Year</span>
                    <span className={styles.detailValue}>{student.graduation_year}</span>
                  </div>
                )}
                {student.gpa && (
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>GPA</span>
                    <span className={styles.detailValue}>{student.gpa.toFixed(2)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Work Authorization */}
            {(student.work_authorization || student.willing_to_relocate !== null) && (
              <div className={styles.card}>
                <h3>Work Preferences</h3>
                <div className={styles.detailsList}>
                  {student.work_authorization && (
                    <div className={styles.detailItem}>
                      <span className={styles.detailLabel}>Work Authorization</span>
                      <span className={styles.detailValue}>{student.work_authorization}</span>
                    </div>
                  )}
                  {student.willing_to_relocate !== null && (
                    <div className={styles.detailItem}>
                      <span className={styles.detailLabel}>Willing to Relocate</span>
                      <span className={styles.detailValue}>
                        {student.willing_to_relocate ? '✅ Yes' : '❌ No'}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Metadata */}
            <div className={styles.card}>
              <h3>Account Info</h3>
              <div className={styles.metadataList}>
                <div className={styles.metadataItem}>
                  <span className={styles.metadataLabel}>Member Since</span>
                  <span className={styles.metadataValue}>
                    {new Date(student.created_at).toLocaleDateString()}
                  </span>
                </div>
                <div className={styles.metadataItem}>
                  <span className={styles.metadataLabel}>Last Updated</span>
                  <span className={styles.metadataValue}>
                    {new Date(student.updated_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className={styles.card}>
              <h3>Actions</h3>
              <div className={styles.actionButtons}>
                <button
                  onClick={() => router.push(`/internal/messages?student=${studentId}`)}
                  className={styles.actionButton}
                >
                  💬 Send Message
                </button>
                <button
                  onClick={() => window.print()}
                  className={styles.actionButtonSecondary}
                >
                  🖨️ Print Profile
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}

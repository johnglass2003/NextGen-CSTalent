/**
 * Internal Matching Page
 * Match vetted students to company job requirements
 */

'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import styles from './page.module.css';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Interfaces
interface Company {
  id: string;
  company_name: string;
  candidates_sent_this_month: number;
  max_candidates_per_month: number;
}

interface JobRequirement {
  id: string;
  company_id: string;
  position_title: string;
  tech_stack: string[];
  location_preferences: string[];
  desired_graduation_dates: string[];
  min_gpa: number | string | null;
  is_active: boolean;
}

interface Student {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  major: string | null;
  graduation_year: number | null;
  gpa: number | null;
  overall_score: number | null;
  technical_skills: string[];
  location: string | null;
  vetting_status: string;
}

interface MatchedStudent extends Student {
  matchScore: number;
  matchDetails: {
    techStackScore: number;
    gradDateScore: number;
    gpaScore: number;
    interestScore: number;
  };
  hasInterest: boolean;
  alreadySent: boolean;
}

export default function InternalMatchingPage() {
  return (
    <ProtectedRoute allowedRoles={['internal']}>
      <MatchingDashboard />
    </ProtectedRoute>
  );
}

function MatchingDashboard() {
  const [supabase] = useState(() => createClient(supabaseUrl, supabaseAnonKey));

  // State
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [requirements, setRequirements] = useState<JobRequirement[]>([]);
  const [selectedRequirement, setSelectedRequirement] = useState<JobRequirement | null>(null);
  const [matchedStudents, setMatchedStudents] = useState<MatchedStudent[]>([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());

  // Loading states
  const [loadingCompanies, setLoadingCompanies] = useState(true);
  const [loadingRequirements, setLoadingRequirements] = useState(false);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [sending, setSending] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [minMatchScore, setMinMatchScore] = useState(0);
  const [sortBy, setSortBy] = useState<'matchScore' | 'overallScore'>('matchScore');
  const [minGpa, setMinGpa] = useState<number | ''>('');

  // Messages
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Fetch companies on mount
  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        const { data, error } = await supabase
          .from('companies')
          .select('id, company_name, candidates_sent_this_month, max_candidates_per_month')
          .order('company_name');

        if (error) throw error;
        setCompanies(data || []);
      } catch (err) {
        console.error('Error fetching companies:', err);
        setError('Failed to load companies');
      } finally {
        setLoadingCompanies(false);
      }
    };

    fetchCompanies();
  }, [supabase]);

  // Fetch requirements when company selected
  useEffect(() => {
    if (!selectedCompanyId) {
      setRequirements([]);
      setSelectedRequirement(null);
      setSelectedCompany(null);
      return;
    }

    const fetchRequirements = async () => {
      setLoadingRequirements(true);
      try {
        // Get company details
        const company = companies.find(c => c.id === selectedCompanyId);
        setSelectedCompany(company || null);

        // Get requirements
        const { data, error } = await supabase
          .from('company_requirements')
          .select('*')
          .eq('company_id', selectedCompanyId)
          .eq('is_active', true)
          .order('position_title');

        if (error) throw error;
        setRequirements(data || []);
        setSelectedRequirement(null);
        setMatchedStudents([]);
      } catch (err) {
        console.error('Error fetching requirements:', err);
        setError('Failed to load job requirements');
      } finally {
        setLoadingRequirements(false);
      }
    };

    fetchRequirements();
  }, [selectedCompanyId, companies, supabase]);

  // Fetch and calculate matched students when requirement selected
  const fetchMatchedStudents = useCallback(async () => {
    if (!selectedRequirement || !selectedCompanyId) {
      setMatchedStudents([]);
      return;
    }

    setLoadingStudents(true);
    setSelectedStudentIds(new Set());

    try {
      // Fetch vetted students
      const { data: students, error: studentsError } = await supabase
        .from('students')
        .select('id, first_name, last_name, email, major, graduation_year, gpa, overall_score, technical_skills, location, vetting_status')
        .eq('vetting_status', 'vetted');

      if (studentsError) throw studentsError;

      // Fetch student interests for this company
      const { data: interests, error: interestsError } = await supabase
        .from('student_company_interests')
        .select('student_id')
        .eq('company_id', selectedCompanyId);

      if (interestsError) throw interestsError;

      const interestedStudentIds = new Set((interests || []).map(i => i.student_id));

      // Fetch already sent submissions for this requirement
      const { data: submissions, error: submissionsError } = await supabase
        .from('candidate_submissions')
        .select('student_id')
        .eq('requirement_id', selectedRequirement.id);

      if (submissionsError) throw submissionsError;

      const sentStudentIds = new Set((submissions || []).map(s => s.student_id));

      // Calculate match scores
      const matched: MatchedStudent[] = (students || []).map(student => {
        const hasInterest = interestedStudentIds.has(student.id);
        const alreadySent = sentStudentIds.has(student.id);

        // Calculate match scores
        const matchDetails = calculateMatchScore(student, selectedRequirement, hasInterest);
        const matchScore = matchDetails.techStackScore + matchDetails.gradDateScore + 
                          matchDetails.gpaScore + matchDetails.interestScore;

        return {
          ...student,
          technical_skills: student.technical_skills || [],
          matchScore,
          matchDetails,
          hasInterest,
          alreadySent,
        };
      });

      // Filter out already sent and sort
      const filteredMatched = matched
        .filter(s => !s.alreadySent)
        .sort((a, b) => b.matchScore - a.matchScore);

      setMatchedStudents(filteredMatched);
    } catch (err) {
      console.error('Error fetching students:', err);
      setError('Failed to load matching students');
    } finally {
      setLoadingStudents(false);
    }
  }, [selectedRequirement, selectedCompanyId, supabase]);

  useEffect(() => {
    fetchMatchedStudents();
  }, [fetchMatchedStudents]);

  // Calculate match score
  function calculateMatchScore(
    student: Student,
    requirement: JobRequirement,
    hasInterest: boolean
  ): MatchedStudent['matchDetails'] {
    let techStackScore = 0;
    let gradDateScore = 0;
    let gpaScore = 0;
    let interestScore = 0;

    // Tech stack overlap (40 points max)
    if (requirement.tech_stack && student.technical_skills) {
      const reqSkills = requirement.tech_stack.map(s => s.toLowerCase());
      const studentSkills = student.technical_skills.map(s => s.toLowerCase());
      const overlap = studentSkills.filter(s => reqSkills.some(r => r.includes(s) || s.includes(r)));
      techStackScore = Math.min(40, overlap.length * 10);
    }

    // Graduation date match (20 points)
    if (requirement.desired_graduation_dates && student.graduation_year) {
      const gradYears = requirement.desired_graduation_dates.map(d => {
        const year = parseInt(d);
        return isNaN(year) ? new Date(d).getFullYear() : year;
      });
      if (gradYears.includes(student.graduation_year)) {
        gradDateScore = 20;
      }
    }

    // GPA requirement (20 points)
    const minGpa = requirement.min_gpa ? parseFloat(String(requirement.min_gpa)) : null;
    if (minGpa && student.gpa) {
      if (student.gpa >= minGpa) {
        gpaScore = 20;
      }
    } else if (!minGpa) {
      gpaScore = 20; // No GPA requirement = full points
    }

    // Already interested (20 points)
    if (hasInterest) {
      interestScore = 20;
    }

    return { techStackScore, gradDateScore, gpaScore, interestScore };
  }

  // Filter and sort students
  const displayedStudents = useMemo(() => {
    let filtered = [...matchedStudents];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(s =>
        `${s.first_name} ${s.last_name}`.toLowerCase().includes(query) ||
        s.email.toLowerCase().includes(query)
      );
    }

    // Min match score filter
    if (minMatchScore > 0) {
      filtered = filtered.filter(s => s.matchScore >= minMatchScore);
    }

    // Min GPA filter
    if (minGpa !== '' && minGpa > 0) {
      filtered = filtered.filter(s => s.gpa && s.gpa >= minGpa);
    }

    // Sort
    if (sortBy === 'matchScore') {
      filtered.sort((a, b) => b.matchScore - a.matchScore);
    } else {
      filtered.sort((a, b) => (b.overall_score || 0) - (a.overall_score || 0));
    }

    return filtered;
  }, [matchedStudents, searchQuery, minMatchScore, minGpa, sortBy]);

  // Selection handlers
  const handleSelectStudent = (studentId: string) => {
    setSelectedStudentIds(prev => {
      const next = new Set(prev);
      if (next.has(studentId)) {
        next.delete(studentId);
      } else {
        next.add(studentId);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedStudentIds.size === displayedStudents.length) {
      setSelectedStudentIds(new Set());
    } else {
      setSelectedStudentIds(new Set(displayedStudents.map(s => s.id)));
    }
  };

  // Calculate remaining candidates
  const remainingCandidates = selectedCompany
    ? selectedCompany.max_candidates_per_month - selectedCompany.candidates_sent_this_month
    : 0;

  const canSend = selectedStudentIds.size > 0 && 
                  selectedStudentIds.size <= remainingCandidates &&
                  selectedRequirement;

  // Send selected students
  const handleSendSelected = async () => {
    if (!canSend || !selectedRequirement || !selectedCompany) return;

    const confirmed = window.confirm(
      `Are you sure you want to send ${selectedStudentIds.size} student(s) to ${selectedCompany.company_name}?`
    );
    if (!confirmed) return;

    setSending(true);
    setError(null);
    setSuccess(null);

    try {
      // Create submissions for each selected student
      const submissions = Array.from(selectedStudentIds).map(studentId => ({
        student_id: studentId,
        company_id: selectedCompanyId,
        requirement_id: selectedRequirement.id,
        status: 'sent',
        sent_date: new Date().toISOString(),
      }));

      const { error: insertError } = await supabase
        .from('candidate_submissions')
        .insert(submissions);

      if (insertError) throw insertError;

      // Update company's candidates_sent_this_month
      const { error: updateError } = await supabase
        .from('companies')
        .update({
          candidates_sent_this_month: selectedCompany.candidates_sent_this_month + selectedStudentIds.size
        })
        .eq('id', selectedCompanyId);

      if (updateError) throw updateError;

      // Update local state
      setSelectedCompany(prev => prev ? {
        ...prev,
        candidates_sent_this_month: prev.candidates_sent_this_month + selectedStudentIds.size
      } : null);

      // Remove sent students from list
      setMatchedStudents(prev => 
        prev.filter(s => !selectedStudentIds.has(s.id))
      );

      setSelectedStudentIds(new Set());
      setSuccess(`Successfully sent ${submissions.length} student(s) to ${selectedCompany.company_name}!`);
    } catch (err) {
      console.error('Error sending candidates:', err);
      setError(err instanceof Error ? err.message : 'Failed to send candidates');
    } finally {
      setSending(false);
    }
  };

  // Get match score color class
  const getMatchScoreClass = (score: number): string => {
    if (score >= 80) return styles.matchExcellent;
    if (score >= 60) return styles.matchGood;
    if (score >= 40) return styles.matchFair;
    return styles.matchLow;
  };

  return (
    <div className={styles.container}>
      {/* Page Header */}
      <header className={styles.header}>
        <h1 className={styles.title}>Student-Company Matching</h1>
        <p className={styles.subtitle}>Match vetted students to job requirements</p>
      </header>

      {/* Messages */}
      {error && (
        <div className={styles.errorMessage}>
          <span>⚠️</span> {error}
          <button onClick={() => setError(null)} className={styles.dismissButton}>✕</button>
        </div>
      )}
      {success && (
        <div className={styles.successMessage}>
          <span>✓</span> {success}
          <button onClick={() => setSuccess(null)} className={styles.dismissButton}>✕</button>
        </div>
      )}

      {/* Two Panel Layout */}
      <div className={styles.panels}>
        {/* Left Panel: Company & Requirements */}
        <aside className={styles.leftPanel}>
          <div className={styles.panelSection}>
            <h2 className={styles.panelTitle}>Select Company</h2>
            {loadingCompanies ? (
              <div className={styles.loadingSmall}>Loading companies...</div>
            ) : (
              <select
                value={selectedCompanyId}
                onChange={(e) => setSelectedCompanyId(e.target.value)}
                className={styles.companySelect}
              >
                <option value="">-- Select a company --</option>
                {companies.map(company => (
                  <option key={company.id} value={company.id}>
                    {company.company_name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {selectedCompany && (
            <div className={styles.companyInfo}>
              <div className={styles.candidateLimit}>
                <span className={styles.limitLabel}>Monthly Limit</span>
                <span className={`${styles.limitValue} ${remainingCandidates <= 0 ? styles.limitReached : ''}`}>
                  {selectedCompany.candidates_sent_this_month} / {selectedCompany.max_candidates_per_month}
                </span>
              </div>
              <div className={styles.remainingBadge}>
                {remainingCandidates > 0 
                  ? `${remainingCandidates} remaining this month`
                  : 'Monthly limit reached'}
              </div>
            </div>
          )}

          <div className={styles.panelSection}>
            <h2 className={styles.panelTitle}>Job Requirements</h2>
            {loadingRequirements ? (
              <div className={styles.loadingSmall}>Loading requirements...</div>
            ) : requirements.length === 0 ? (
              <p className={styles.emptyText}>
                {selectedCompanyId ? 'No active requirements' : 'Select a company first'}
              </p>
            ) : (
              <div className={styles.requirementsList}>
                {requirements.map(req => (
                  <button
                    key={req.id}
                    onClick={() => setSelectedRequirement(req)}
                    className={`${styles.requirementCard} ${selectedRequirement?.id === req.id ? styles.requirementSelected : ''}`}
                  >
                    <h3 className={styles.requirementTitle}>{req.position_title}</h3>
                    {req.tech_stack && req.tech_stack.length > 0 && (
                      <div className={styles.techStackPreview}>
                        {req.tech_stack.slice(0, 3).map((tech, i) => (
                          <span key={i} className={styles.techTag}>{tech}</span>
                        ))}
                        {req.tech_stack.length > 3 && (
                          <span className={styles.techMore}>+{req.tech_stack.length - 3}</span>
                        )}
                      </div>
                    )}
                    <div className={styles.requirementMeta}>
                      {req.location_preferences && req.location_preferences.length > 0 && (
                        <span>📍 {req.location_preferences[0]}</span>
                      )}
                      {req.min_gpa && <span>GPA: {req.min_gpa}+</span>}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </aside>

        {/* Right Panel: Matching Students */}
        <main className={styles.rightPanel}>
          {!selectedRequirement ? (
            <div className={styles.emptyState}>
              <span className={styles.emptyIcon}>👥</span>
              <h2>Select a Job Requirement</h2>
              <p>Choose a company and job requirement from the left panel to see matching students.</p>
            </div>
          ) : (
            <>
              {/* Filters & Actions Bar */}
              <div className={styles.actionsBar}>
                <div className={styles.filtersRow}>
                  <input
                    type="text"
                    placeholder="Search students..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className={styles.searchInput}
                  />
                  <select
                    value={minMatchScore}
                    onChange={(e) => setMinMatchScore(parseInt(e.target.value))}
                    className={styles.filterSelect}
                  >
                    <option value={0}>All Match Scores</option>
                    <option value={40}>40%+ Match</option>
                    <option value={60}>60%+ Match</option>
                    <option value={80}>80%+ Match</option>
                  </select>
                  <select
                    value={minGpa === '' ? '' : minGpa}
                    onChange={(e) => setMinGpa(e.target.value ? parseFloat(e.target.value) : '')}
                    className={styles.filterSelect}
                  >
                    <option value="">Any GPA</option>
                    <option value={3.0}>3.0+ GPA</option>
                    <option value={3.5}>3.5+ GPA</option>
                    <option value={3.8}>3.8+ GPA</option>
                  </select>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as 'matchScore' | 'overallScore')}
                    className={styles.filterSelect}
                  >
                    <option value="matchScore">Sort by Match Score</option>
                    <option value="overallScore">Sort by Overall Score</option>
                  </select>
                </div>
                <div className={styles.actionsRow}>
                  <label className={styles.selectAllLabel}>
                    <input
                      type="checkbox"
                      checked={displayedStudents.length > 0 && selectedStudentIds.size === displayedStudents.length}
                      onChange={handleSelectAll}
                      className={styles.checkbox}
                    />
                    Select All ({displayedStudents.length})
                  </label>
                  <span className={styles.selectedCount}>
                    {selectedStudentIds.size} selected
                  </span>
                  <button
                    onClick={handleSendSelected}
                    disabled={!canSend || sending}
                    className={styles.sendButton}
                  >
                    {sending ? 'Sending...' : `Send ${selectedStudentIds.size} to Company`}
                  </button>
                </div>
              </div>

              {/* Selected Requirement Info */}
              <div className={styles.selectedRequirementInfo}>
                <h3>Matching for: {selectedRequirement.position_title}</h3>
                {selectedRequirement.tech_stack && (
                  <div className={styles.techStackFull}>
                    <span className={styles.infoLabel}>Required Skills:</span>
                    {selectedRequirement.tech_stack.map((tech, i) => (
                      <span key={i} className={styles.techTag}>{tech}</span>
                    ))}
                  </div>
                )}
              </div>

              {/* Students List */}
              {loadingStudents ? (
                <div className={styles.loadingContainer}>
                  <div className={styles.spinner}></div>
                  <p>Finding matching students...</p>
                </div>
              ) : displayedStudents.length === 0 ? (
                <div className={styles.emptyState}>
                  <span className={styles.emptyIcon}>🔍</span>
                  <h2>No Matching Students</h2>
                  <p>
                    {matchedStudents.length === 0
                      ? 'No vetted students available for this requirement.'
                      : 'No students match the current filters.'}
                  </p>
                </div>
              ) : (
                <div className={styles.studentsList}>
                  {displayedStudents.map(student => (
                    <div
                      key={student.id}
                      className={`${styles.studentCard} ${selectedStudentIds.has(student.id) ? styles.studentSelected : ''}`}
                    >
                      <div className={styles.studentCheckbox}>
                        <input
                          type="checkbox"
                          checked={selectedStudentIds.has(student.id)}
                          onChange={() => handleSelectStudent(student.id)}
                          className={styles.checkbox}
                        />
                      </div>

                      <div className={styles.studentInfo}>
                        <div className={styles.studentHeader}>
                          <h4 className={styles.studentName}>
                            {student.first_name} {student.last_name}
                          </h4>
                          {student.hasInterest && (
                            <span className={styles.interestedBadge}>★ Interested</span>
                          )}
                        </div>
                        <p className={styles.studentMeta}>
                          {student.major || 'No major'} • Class of {student.graduation_year || 'N/A'}
                          {student.gpa && ` • GPA: ${student.gpa.toFixed(2)}`}
                        </p>
                        {student.location && (
                          <p className={styles.studentLocation}>📍 {student.location}</p>
                        )}
                        {student.technical_skills && student.technical_skills.length > 0 && (
                          <div className={styles.studentSkills}>
                            {student.technical_skills.slice(0, 5).map((skill, i) => (
                              <span 
                                key={i} 
                                className={`${styles.skillTag} ${
                                  selectedRequirement.tech_stack?.some(t => 
                                    t.toLowerCase().includes(skill.toLowerCase()) ||
                                    skill.toLowerCase().includes(t.toLowerCase())
                                  ) ? styles.skillMatch : ''
                                }`}
                              >
                                {skill}
                              </span>
                            ))}
                            {student.technical_skills.length > 5 && (
                              <span className={styles.skillMore}>+{student.technical_skills.length - 5}</span>
                            )}
                          </div>
                        )}
                      </div>

                      <div className={styles.studentScores}>
                        <div className={`${styles.matchScoreBadge} ${getMatchScoreClass(student.matchScore)}`}>
                          <span className={styles.matchScoreValue}>{student.matchScore}%</span>
                          <span className={styles.matchScoreLabel}>Match</span>
                        </div>
                        <div className={styles.matchBreakdown}>
                          <div className={styles.breakdownItem} title="Tech Stack">
                            💻 {student.matchDetails.techStackScore}/40
                          </div>
                          <div className={styles.breakdownItem} title="Graduation Date">
                            🎓 {student.matchDetails.gradDateScore}/20
                          </div>
                          <div className={styles.breakdownItem} title="GPA">
                            📊 {student.matchDetails.gpaScore}/20
                          </div>
                          <div className={styles.breakdownItem} title="Interest">
                            ⭐ {student.matchDetails.interestScore}/20
                          </div>
                        </div>
                        {student.overall_score !== null && (
                          <div className={styles.overallScore}>
                            Interview: {student.overall_score}/100
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}

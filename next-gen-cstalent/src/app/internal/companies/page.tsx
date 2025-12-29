'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { useRouter } from 'next/navigation';
import styles from './page.module.css';

// =============================================================================
// Types
// =============================================================================

interface Company {
  id: string;
  company_name: string;
  industry: string | null;
  description: string | null;
  website: string | null;
  logo_url: string | null;
  phone: string | null;
  primary_contact_name: string | null;
  primary_contact_email: string | null;
  subscription_tier: 'starter' | 'growth' | 'enterprise';
  candidates_sent_this_month: number;
  max_candidates_per_month: number;
  is_active: boolean;
  is_public: boolean;
  notes: string | null;
  onboarding_date: string | null;
  billing_status: 'current' | 'overdue' | 'cancelled';
  created_at: string;
}

interface CompanyRequirement {
  id: string;
  position_title: string;
  tech_stack: string[] | null;
  is_active: boolean;
}

interface CandidateActivity {
  id: string;
  status: string;
  created_at: string;
  students: { first_name: string; last_name: string }[] | null;
  company_requirements: { position_title: string }[] | null;
}

interface CompanyStats {
  totalCandidatesSent: number;
  totalInterviews: number;
  totalHires: number;
  successRate: number;
}

type TierFilter = 'all' | 'starter' | 'growth' | 'enterprise';
type StatusFilter = 'all' | 'active' | 'inactive';

// =============================================================================
// Constants
// =============================================================================

const TIER_OPTIONS = [
  { value: 'all', label: 'All Tiers' },
  { value: 'starter', label: 'Starter' },
  { value: 'growth', label: 'Growth' },
  { value: 'enterprise', label: 'Enterprise' },
] as const;

const STATUS_OPTIONS = [
  { value: 'all', label: 'All Status' },
  { value: 'active', label: 'Active Only' },
  { value: 'inactive', label: 'Inactive Only' },
] as const;

const TIER_LIMITS: Record<string, number> = {
  starter: 5,
  growth: 15,
  enterprise: 999,
};

// =============================================================================
// Helper Functions
// =============================================================================

function getStatusIcon(status: string): string {
  switch (status) {
    case 'hired': return '✅';
    case 'interview_scheduled': return '📅';
    case 'company_interested': return '💼';
    default: return '📤';
  }
}

function formatDate(dateString: string | null): string {
  if (!dateString) return 'Not set';
  return new Date(dateString).toLocaleDateString();
}

// =============================================================================
// Main Component
// =============================================================================

export default function InternalCompaniesPage() {
  const router = useRouter();
  
  // State
  const [companies, setCompanies] = useState<Company[]>([]);
  const [filteredCompanies, setFilteredCompanies] = useState<Company[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [tierFilter, setTierFilter] = useState<TierFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  
  // Selected company details
  const [companyStats, setCompanyStats] = useState<CompanyStats>({
    totalCandidatesSent: 0,
    totalInterviews: 0,
    totalHires: 0,
    successRate: 0,
  });
  const [companyRequirements, setCompanyRequirements] = useState<CompanyRequirement[]>([]);
  const [recentActivity, setRecentActivity] = useState<CandidateActivity[]>([]);

  // ===========================================================================
  // Data Fetching
  // ===========================================================================

  const fetchCompanies = useCallback(async () => {
    const { data, error } = await supabase
      .from('companies')
      .select('*')
      .order('company_name', { ascending: true });

    if (error) {
      console.error('Error fetching companies:', error);
      setLoading(false);
      return;
    }

    if (data) {
      setCompanies(data);
      setFilteredCompanies(data);
      if (data.length > 0 && !selectedCompany) {
        setSelectedCompany(data[0]);
      }
    }
    setLoading(false);
  }, [selectedCompany]);

  const fetchCompanyDetails = useCallback(async (companyId: string) => {
    // Fetch stats in parallel
    const [sentResult, interviewsResult, hiresResult] = await Promise.all([
      supabase
        .from('candidate_submissions')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', companyId),
      supabase
        .from('candidate_submissions')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', companyId)
        .in('status', ['interview_scheduled', 'hired']),
      supabase
        .from('candidate_submissions')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', companyId)
        .eq('status', 'hired'),
    ]);

    const totalSent = sentResult.count || 0;
    const totalInterviews = interviewsResult.count || 0;
    const totalHires = hiresResult.count || 0;
    const successRate = totalSent > 0 ? Math.round((totalHires / totalSent) * 100) : 0;

    setCompanyStats({ totalCandidatesSent: totalSent, totalInterviews, totalHires, successRate });

    // Fetch requirements and activity in parallel
    const [requirementsResult, activityResult] = await Promise.all([
      supabase
        .from('company_requirements')
        .select('id, position_title, tech_stack, is_active')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false }),
      supabase
        .from('candidate_submissions')
        .select(`
          id, status, created_at,
          students (first_name, last_name),
          company_requirements (position_title)
        `)
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })
        .limit(5),
    ]);

    setCompanyRequirements(requirementsResult.data || []);
    setRecentActivity(activityResult.data || []);
  }, []);

  // ===========================================================================
  // Filtering
  // ===========================================================================

  const applyFilters = useCallback(() => {
    let filtered = [...companies];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(c => 
        c.company_name.toLowerCase().includes(term) ||
        c.industry?.toLowerCase().includes(term)
      );
    }

    if (tierFilter !== 'all') {
      filtered = filtered.filter(c => c.subscription_tier === tierFilter);
    }

    if (statusFilter === 'active') {
      filtered = filtered.filter(c => c.is_active);
    } else if (statusFilter === 'inactive') {
      filtered = filtered.filter(c => !c.is_active);
    }

    setFilteredCompanies(filtered);
  }, [companies, searchTerm, tierFilter, statusFilter]);

  // ===========================================================================
  // Event Handlers
  // ===========================================================================

  const handleSelectCompany = (company: Company) => {
    setSelectedCompany(company);
  };

  const handleUpdateCompany = async (updatedData: Partial<Company>) => {
    if (!selectedCompany) return;

    const { error } = await supabase
      .from('companies')
      .update(updatedData)
      .eq('id', selectedCompany.id);

    if (!error) {
      await fetchCompanies();
      setShowEditModal(false);
    }
  };

  // ===========================================================================
  // Effects
  // ===========================================================================

  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  useEffect(() => {
    applyFilters();
  }, [applyFilters]);

  useEffect(() => {
    if (selectedCompany) {
      fetchCompanyDetails(selectedCompany.id);
    }
  }, [selectedCompany, fetchCompanyDetails]);

  // ===========================================================================
  // Render
  // ===========================================================================

  if (loading) {
    return (
      <ProtectedRoute allowedRoles={['internal']}>
        <div className={styles.container}>
          <div className={styles.loading}>Loading companies...</div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute allowedRoles={['internal']}>
      <div className={styles.container}>
        <header className={styles.header}>
          <h1>Company Management</h1>
        </header>

        {/* Filters */}
        <div className={styles.filtersBar}>
          <input
            type="text"
            placeholder="Search companies..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={styles.searchInput}
          />
          <select
            value={tierFilter}
            onChange={(e) => setTierFilter(e.target.value as TierFilter)}
            className={styles.filterSelect}
          >
            {TIER_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            className={styles.filterSelect}
          >
            {STATUS_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <span className={styles.resultsCount}>
            {filteredCompanies.length} {filteredCompanies.length === 1 ? 'company' : 'companies'}
          </span>
        </div>

        {/* Two Panel Layout */}
        <div className={styles.splitPane}>
          {/* Left Panel: Company List */}
          <aside className={styles.listPanel}>
            {filteredCompanies.length === 0 ? (
              <div className={styles.emptyState}>No companies found</div>
            ) : (
              filteredCompanies.map(company => (
                <CompanyListItem
                  key={company.id}
                  company={company}
                  isSelected={selectedCompany?.id === company.id}
                  onClick={() => handleSelectCompany(company)}
                />
              ))
            )}
          </aside>

          {/* Right Panel: Company Details */}
          <main className={styles.detailsPanel}>
            {selectedCompany ? (
              <CompanyDetails
                company={selectedCompany}
                stats={companyStats}
                requirements={companyRequirements}
                activity={recentActivity}
                onEdit={() => setShowEditModal(true)}
                router={router}
              />
            ) : (
              <div className={styles.emptyState}>Select a company to view details</div>
            )}
          </main>
        </div>

        {/* Edit Modal */}
        {showEditModal && selectedCompany && (
          <EditCompanyModal
            company={selectedCompany}
            onClose={() => setShowEditModal(false)}
            onSave={handleUpdateCompany}
          />
        )}
      </div>
    </ProtectedRoute>
  );
}

// =============================================================================
// Sub Components
// =============================================================================

interface CompanyListItemProps {
  company: Company;
  isSelected: boolean;
  onClick: () => void;
}

function CompanyListItem({ company, isSelected, onClick }: CompanyListItemProps) {
  return (
    <div
      className={`${styles.listItem} ${isSelected ? styles.selected : ''}`}
      onClick={onClick}
    >
      {company.logo_url && (
        <img 
          src={company.logo_url} 
          alt={company.company_name} 
          className={styles.logoSmall} 
        />
      )}
      <div className={styles.listItemInfo}>
        <div className={styles.companyName}>{company.company_name}</div>
        <div className={styles.companyMeta}>
          <span className={`${styles.tierBadge} ${styles[`tier${company.subscription_tier}`]}`}>
            {company.subscription_tier}
          </span>
          <span className={`${styles.statusBadge} ${company.is_active ? styles.active : styles.inactive}`}>
            {company.is_active ? 'Active' : 'Inactive'}
          </span>
        </div>
        <div className={styles.usage}>
          {company.candidates_sent_this_month}/{company.max_candidates_per_month} used
        </div>
      </div>
    </div>
  );
}

interface CompanyDetailsProps {
  company: Company;
  stats: CompanyStats;
  requirements: CompanyRequirement[];
  activity: CandidateActivity[];
  onEdit: () => void;
  router: ReturnType<typeof useRouter>;
}

function CompanyDetails({ company, stats, requirements, activity, onEdit, router }: CompanyDetailsProps) {
  const usagePercent = company.max_candidates_per_month > 0
    ? (company.candidates_sent_this_month / company.max_candidates_per_month) * 100
    : 0;

  return (
    <>
      {/* Header */}
      <div className={styles.detailsHeader}>
        <div className={styles.companyIdentity}>
          {company.logo_url && (
            <img src={company.logo_url} alt={company.company_name} className={styles.logoLarge} />
          )}
          <div>
            <h2>{company.company_name}</h2>
            <p className={styles.industry}>{company.industry || 'No industry set'}</p>
          </div>
        </div>
        <button className={styles.btnPrimary} onClick={onEdit}>
          Edit Company
        </button>
      </div>

      {/* Basic Information */}
      <section className={styles.section}>
        <h3>Basic Information</h3>
        <div className={styles.infoGrid}>
          <InfoItem label="Website">
            {company.website ? (
              <a href={company.website} target="_blank" rel="noopener noreferrer">
                {company.website}
              </a>
            ) : 'Not set'}
          </InfoItem>
          <InfoItem label="Description">
            {company.description || 'No description'}
          </InfoItem>
          <InfoItem label="Onboarding Date">
            {formatDate(company.onboarding_date)}
          </InfoItem>
          <InfoItem label="Status">
            <span className={`${styles.statusBadge} ${company.is_active ? styles.active : styles.inactive}`}>
              {company.is_active ? 'Active' : 'Inactive'}
            </span>
          </InfoItem>
        </div>
      </section>

      {/* Contact Information */}
      <section className={styles.section}>
        <h3>Contact Information</h3>
        <div className={styles.infoGrid}>
          <InfoItem label="Primary Contact">{company.primary_contact_name || 'Not set'}</InfoItem>
          <InfoItem label="Email">{company.primary_contact_email || 'Not set'}</InfoItem>
          <InfoItem label="Phone">{company.phone || 'Not set'}</InfoItem>
        </div>
      </section>

      {/* Subscription & Usage */}
      <section className={styles.section}>
        <h3>Subscription & Usage</h3>
        <div className={styles.infoGrid}>
          <InfoItem label="Subscription Tier">
            <span className={`${styles.tierBadge} ${styles[`tier${company.subscription_tier}`]}`}>
              {company.subscription_tier}
            </span>
          </InfoItem>
          <InfoItem label="Monthly Limit">
            {company.max_candidates_per_month} candidates
          </InfoItem>
          <InfoItem label="Used This Month">
            <div>
              {company.candidates_sent_this_month} / {company.max_candidates_per_month}
              <div className={styles.usageBar}>
                <div className={styles.usageProgress} style={{ width: `${usagePercent}%` }} />
              </div>
            </div>
          </InfoItem>
          <InfoItem label="Billing Status">
            <span className={`${styles.billingBadge} ${styles[`billing${company.billing_status}`]}`}>
              {company.billing_status}
            </span>
          </InfoItem>
        </div>
      </section>

      {/* Statistics */}
      <section className={styles.section}>
        <h3>Statistics</h3>
        <div className={styles.statsGrid}>
          <StatCard value={stats.totalCandidatesSent} label="Total Candidates Sent" />
          <StatCard value={stats.totalInterviews} label="Interviews Scheduled" />
          <StatCard value={stats.totalHires} label="Total Hires" />
          <StatCard value={`${stats.successRate}%`} label="Success Rate" />
        </div>
      </section>

      {/* Job Postings */}
      <section className={styles.section}>
        <h3>Job Postings ({requirements.length})</h3>
        {requirements.length === 0 ? (
          <p className={styles.emptyState}>No job postings yet</p>
        ) : (
          <div className={styles.requirementsList}>
            {requirements.map(req => (
              <div key={req.id} className={styles.requirementItem}>
                <div>
                  <div className={styles.requirementTitle}>{req.position_title}</div>
                  <div className={styles.techTags}>
                    {req.tech_stack?.slice(0, 3).map((tech: string) => (
                      <span key={tech} className={styles.techTag}>{tech}</span>
                    ))}
                    {(req.tech_stack?.length || 0) > 3 && (
                      <span className={styles.techTag}>+{req.tech_stack!.length - 3} more</span>
                    )}
                  </div>
                </div>
                <span className={`${styles.statusBadge} ${req.is_active ? styles.active : styles.inactive}`}>
                  {req.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Recent Activity */}
      <section className={styles.section}>
        <h3>Recent Activity</h3>
        {activity.length === 0 ? (
          <p className={styles.emptyState}>No recent activity</p>
        ) : (
          <div className={styles.activityList}>
            {activity.map(item => (
              <div key={item.id} className={styles.activityItem}>
                <span className={styles.activityIcon}>{getStatusIcon(item.status)}</span>
                <div className={styles.activityContent}>
                  <div className={styles.activityText}>
                    <strong>{item.students?.[0]?.first_name} {item.students?.[0]?.last_name}</strong>
                    {' '}for{' '}
                    <strong>{item.company_requirements?.[0]?.position_title}</strong>
                  </div>
                  <div className={styles.activityMeta}>
                    <span className={`${styles.statusBadge} ${styles[`status${item.status.replace('_', '')}`]}`}>
                      {item.status.replace('_', ' ')}
                    </span>
                    <span className={styles.activityDate}>{formatDate(item.created_at)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Internal Notes */}
      <section className={styles.section}>
        <h3>Internal Notes</h3>
        <p className={styles.notesText}>{company.notes || 'No notes'}</p>
      </section>

      {/* Quick Actions */}
      <section className={styles.section}>
        <h3>Quick Actions</h3>
        <div className={styles.quickActions}>
          <button className={styles.btnSecondary} onClick={() => router.push(`/internal/matching?company=${company.id}`)}>
            📤 Send Candidates
          </button>
          <button className={styles.btnSecondary} onClick={() => router.push(`/companies/requirements?company=${company.id}`)}>
            📋 View Job Postings
          </button>
          <button className={styles.btnSecondary} onClick={() => router.push(`/internal/messages?company=${company.id}`)}>
            💬 Message Company
          </button>
          <button className={styles.btnSecondary} onClick={() => router.push(`/internal/calendar?action=create&type=company_call&company=${company.id}`)}>
            📞 Schedule Call
          </button>
          <button className={styles.btnSecondary} onClick={() => router.push(`/internal/submissions?company=${company.id}`)}>
            👥 View Sent Candidates
          </button>
        </div>
      </section>
    </>
  );
}

function InfoItem({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className={styles.infoItem}>
      <label>{label}</label>
      <div>{children}</div>
    </div>
  );
}

function StatCard({ value, label }: { value: string | number; label: string }) {
  return (
    <div className={styles.statCard}>
      <div className={styles.statValue}>{value}</div>
      <div className={styles.statLabel}>{label}</div>
    </div>
  );
}

// =============================================================================
// Edit Modal Component
// =============================================================================

interface EditCompanyModalProps {
  company: Company;
  onClose: () => void;
  onSave: (data: Partial<Company>) => Promise<void>;
}

function EditCompanyModal({ company, onClose, onSave }: EditCompanyModalProps) {
  const [formData, setFormData] = useState({
    company_name: company.company_name,
    industry: company.industry || '',
    description: company.description || '',
    website: company.website || '',
    phone: company.phone || '',
    primary_contact_name: company.primary_contact_name || '',
    primary_contact_email: company.primary_contact_email || '',
    subscription_tier: company.subscription_tier,
    max_candidates_per_month: company.max_candidates_per_month,
    is_active: company.is_active,
    billing_status: company.billing_status,
    notes: company.notes || '',
  });
  const [saving, setSaving] = useState(false);

  const handleChange = (field: string, value: string | number | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleTierChange = (tier: string) => {
    setFormData(prev => ({
      ...prev,
      subscription_tier: tier as Company['subscription_tier'],
      max_candidates_per_month: TIER_LIMITS[tier] || prev.max_candidates_per_month,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await onSave(formData);
    setSaving(false);
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <h2>Edit Company</h2>
        <form onSubmit={handleSubmit}>
          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label>Company Name *</label>
              <input
                type="text"
                value={formData.company_name}
                onChange={(e) => handleChange('company_name', e.target.value)}
                required
              />
            </div>
            <div className={styles.formGroup}>
              <label>Industry</label>
              <input
                type="text"
                value={formData.industry}
                onChange={(e) => handleChange('industry', e.target.value)}
              />
            </div>
          </div>

          <div className={styles.formGroup}>
            <label>Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              rows={3}
            />
          </div>

          <div className={styles.formGroup}>
            <label>Website</label>
            <input
              type="url"
              value={formData.website}
              onChange={(e) => handleChange('website', e.target.value)}
            />
          </div>

          <h4>Contact Information</h4>
          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label>Primary Contact Name</label>
              <input
                type="text"
                value={formData.primary_contact_name}
                onChange={(e) => handleChange('primary_contact_name', e.target.value)}
              />
            </div>
            <div className={styles.formGroup}>
              <label>Contact Email</label>
              <input
                type="email"
                value={formData.primary_contact_email}
                onChange={(e) => handleChange('primary_contact_email', e.target.value)}
              />
            </div>
          </div>

          <div className={styles.formGroup}>
            <label>Phone</label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => handleChange('phone', e.target.value)}
            />
          </div>

          <h4>Subscription</h4>
          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label>Subscription Tier</label>
              <select
                value={formData.subscription_tier}
                onChange={(e) => handleTierChange(e.target.value)}
              >
                <option value="starter">Starter</option>
                <option value="growth">Growth</option>
                <option value="enterprise">Enterprise</option>
              </select>
            </div>
            <div className={styles.formGroup}>
              <label>Max Candidates/Month</label>
              <input
                type="number"
                value={formData.max_candidates_per_month}
                onChange={(e) => handleChange('max_candidates_per_month', parseInt(e.target.value))}
              />
            </div>
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label>Billing Status</label>
              <select
                value={formData.billing_status}
                onChange={(e) => handleChange('billing_status', e.target.value)}
              >
                <option value="current">Current</option>
                <option value="overdue">Overdue</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            <div className={styles.formGroup}>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => handleChange('is_active', e.target.checked)}
                />
                Active
              </label>
            </div>
          </div>

          <div className={styles.formGroup}>
            <label>Internal Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
              rows={4}
              placeholder="Private notes about this company..."
            />
          </div>

          <div className={styles.modalActions}>
            <button type="submit" className={styles.btnPrimary} disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
            <button type="button" className={styles.btnSecondary} onClick={onClose}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

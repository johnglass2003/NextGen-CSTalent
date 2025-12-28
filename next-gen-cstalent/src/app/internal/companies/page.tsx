/**
 * Internal Companies Management Page
 * Two-panel layout for managing company accounts
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import styles from './page.module.css';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

type SubscriptionTier = 'starter' | 'growth' | 'enterprise';
type BillingStatus = 'current' | 'overdue' | 'cancelled';

interface Company {
  id: string;
  company_name: string;
  industry: string;
  description: string;
  website: string;
  logo_url: string;
  phone: string;
  primary_contact_name: string;
  primary_contact_email: string;
  subscription_tier: SubscriptionTier;
  candidates_sent_this_month: number;
  max_candidates_per_month: number;
  is_active: boolean;
  is_public: boolean;
  notes: string;
  onboarding_date: string;
  billing_status: BillingStatus;
  created_at: string;
}

interface CompanyStats {
  totalCandidatesSent: number;
  totalInterviews: number;
  totalHires: number;
  successRate: number;
}

interface CompanyRequirement {
  id: string;
  position_title: string;
  tech_stack: string[];
  is_active: boolean;
  created_at: string;
}

interface ActivityItem {
  id: string;
  status: string;
  created_at: string;
  students: {
    first_name: string;
    last_name: string;
  } | null;
  company_requirements: {
    position_title: string;
  } | null;
}

export default function InternalCompaniesPage() {
  return (
    <ProtectedRoute allowedRoles={['internal']}>
      <CompaniesManagement />
    </ProtectedRoute>
  );
}

function CompaniesManagement() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [filteredCompanies, setFilteredCompanies] = useState<Company[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [tierFilter, setTierFilter] = useState<string>('all');
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editFormData, setEditFormData] = useState<Partial<Company>>({});
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  const [companyStats, setCompanyStats] = useState<CompanyStats>({
    totalCandidatesSent: 0,
    totalInterviews: 0,
    totalHires: 0,
    successRate: 0,
  });
  const [companyRequirements, setCompanyRequirements] = useState<CompanyRequirement[]>([]);
  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([]);

  const fetchCompanies = useCallback(async () => {
    const { data, error } = await supabase
      .from('companies')
      .select('*')
      .order('company_name', { ascending: true });

    if (error) {
      console.error('Error fetching companies:', error);
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

  const applyFilters = useCallback(() => {
    let filtered = [...companies];

    if (searchTerm) {
      filtered = filtered.filter(c =>
        c.company_name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (tierFilter !== 'all') {
      filtered = filtered.filter(c => c.subscription_tier === tierFilter);
    }

    if (activeFilter === 'active') {
      filtered = filtered.filter(c => c.is_active === true);
    } else if (activeFilter === 'inactive') {
      filtered = filtered.filter(c => c.is_active === false);
    }

    setFilteredCompanies(filtered);
  }, [companies, searchTerm, tierFilter, activeFilter]);

  const fetchCompanyDetails = useCallback(async (companyId: string) => {
    // Fetch stats
    const { count: totalSent } = await supabase
      .from('candidate_submissions')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', companyId);

    const { count: totalInterviews } = await supabase
      .from('candidate_submissions')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', companyId)
      .in('status', ['interview_scheduled', 'hired']);

    const { count: totalHires } = await supabase
      .from('candidate_submissions')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', companyId)
      .eq('status', 'hired');

    const successRate = totalSent && totalSent > 0 ? Math.round(((totalHires || 0) / totalSent) * 100) : 0;

    setCompanyStats({
      totalCandidatesSent: totalSent || 0,
      totalInterviews: totalInterviews || 0,
      totalHires: totalHires || 0,
      successRate,
    });

    // Fetch job requirements
    const { data: requirements } = await supabase
      .from('company_requirements')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });

    setCompanyRequirements(requirements || []);

    // Fetch recent activity
    const { data: activity } = await supabase
      .from('candidate_submissions')
      .select(`
        *,
        students (first_name, last_name),
        company_requirements (position_title)
      `)
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })
      .limit(5);

    setRecentActivity(activity || []);
  }, []);

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

  async function handleUpdateCompany(updatedData: Partial<Company>) {
    if (!selectedCompany) return;

    const { error } = await supabase
      .from('companies')
      .update(updatedData)
      .eq('id', selectedCompany.id);

    if (!error) {
      fetchCompanies();
      setIsEditing(false);
    }
  }

  function startEditing() {
    if (!selectedCompany) return;
    setEditFormData({
      company_name: selectedCompany.company_name,
      industry: selectedCompany.industry || '',
      description: selectedCompany.description || '',
      website: selectedCompany.website || '',
      phone: selectedCompany.phone || '',
      primary_contact_name: selectedCompany.primary_contact_name || '',
      primary_contact_email: selectedCompany.primary_contact_email || '',
      subscription_tier: selectedCompany.subscription_tier,
      max_candidates_per_month: selectedCompany.max_candidates_per_month || 5,
      is_active: selectedCompany.is_active,
      billing_status: selectedCompany.billing_status || 'current',
      notes: selectedCompany.notes || '',
    });
    setIsEditing(true);
  }

  function cancelEditing() {
    setIsEditing(false);
    setEditFormData({});
  }

  async function saveChanges() {
    setSaving(true);
    await handleUpdateCompany(editFormData);
    setSaving(false);
  }

  function handleTierChange(tier: string) {
    const maxMap: Record<string, number> = { starter: 5, growth: 15, enterprise: 999 };
    setEditFormData({ 
      ...editFormData, 
      subscription_tier: tier as SubscriptionTier,
      max_candidates_per_month: maxMap[tier] || 5
    });
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'hired': return '✅';
      case 'interview_scheduled': return '📅';
      case 'company_interested': return '💼';
      default: return '📤';
    }
  };

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}></div>
        <p>Loading companies...</p>
      </div>
    );
  }

  return (
    <div className={styles.companiesPage}>
      <header className={styles.header}>
        <h1 className={styles.title}>Company Management</h1>
        <p className={styles.subtitle}>View and manage company accounts</p>
      </header>

      {/* Filters Bar */}
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
          onChange={(e) => setTierFilter(e.target.value)}
          className={styles.filterSelect}
        >
          <option value="all">All Tiers</option>
          <option value="starter">Starter</option>
          <option value="growth">Growth</option>
          <option value="enterprise">Enterprise</option>
        </select>

        <select
          value={activeFilter}
          onChange={(e) => setActiveFilter(e.target.value)}
          className={styles.filterSelect}
        >
          <option value="all">All Status</option>
          <option value="active">Active Only</option>
          <option value="inactive">Inactive Only</option>
        </select>

        <div className={styles.resultsCount}>
          {filteredCompanies.length} {filteredCompanies.length === 1 ? 'company' : 'companies'}
        </div>
      </div>

      {/* Two Panel Layout */}
      <div className={styles.twoPanelLayout}>
        
        {/* Left Panel: Company List */}
        <div className={styles.companyListPanel}>
          {filteredCompanies.length === 0 ? (
            <div className={styles.emptyState}>No companies found</div>
          ) : (
            filteredCompanies.map(company => (
              <div
                key={company.id}
                className={`${styles.companyListItem} ${selectedCompany?.id === company.id ? styles.selected : ''}`}
                onClick={() => setSelectedCompany(company)}
              >
                {company.logo_url && (
                  <img src={company.logo_url} alt={company.company_name} className={styles.companyLogoSmall} />
                )}
                <div className={styles.companyListInfo}>
                  <div className={styles.companyName}>{company.company_name}</div>
                  <div className={styles.companyMeta}>
                    <span className={`${styles.tierBadge} ${styles[`tier${company.subscription_tier.charAt(0).toUpperCase() + company.subscription_tier.slice(1)}`]}`}>
                      {company.subscription_tier}
                    </span>
                    <span className={`${styles.statusBadge} ${company.is_active ? styles.active : styles.inactive}`}>
                      {company.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <div className={styles.companyUsage}>
                    {company.candidates_sent_this_month || 0}/{company.max_candidates_per_month || 0} used
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Right Panel: Company Details */}
        <div className={styles.companyDetailsPanel}>
          {selectedCompany ? (
            <>
              {/* Header with Edit Button */}
              <div className={styles.detailsHeader}>
                <div className={styles.detailsHeaderInfo}>
                  {selectedCompany.logo_url && (
                    <img src={selectedCompany.logo_url} alt={selectedCompany.company_name} className={styles.companyLogoLarge} />
                  )}
                  <div>
                    {isEditing ? (
                      <>
                        <input
                          type="text"
                          value={editFormData.company_name || ''}
                          onChange={(e) => setEditFormData({ ...editFormData, company_name: e.target.value })}
                          className={styles.editInput}
                          placeholder="Company Name"
                        />
                        <input
                          type="text"
                          value={editFormData.industry || ''}
                          onChange={(e) => setEditFormData({ ...editFormData, industry: e.target.value })}
                          className={styles.editInputSmall}
                          placeholder="Industry"
                        />
                      </>
                    ) : (
                      <>
                        <h2 className={styles.companyDetailName}>{selectedCompany.company_name}</h2>
                        <p className={styles.companyIndustry}>{selectedCompany.industry}</p>
                      </>
                    )}
                  </div>
                </div>
                <div className={styles.headerActions}>
                  {isEditing ? (
                    <>
                      <button
                        className={styles.saveButton}
                        onClick={saveChanges}
                        disabled={saving}
                      >
                        {saving ? 'Saving...' : 'Save'}
                      </button>
                      <button
                        className={styles.cancelButton}
                        onClick={cancelEditing}
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <button
                      className={styles.editButton}
                      onClick={startEditing}
                    >
                      Edit Company
                    </button>
                  )}
                </div>
              </div>

              {/* Basic Information */}
              <section className={styles.detailsSection}>
                <h3 className={styles.sectionTitle}>Basic Information</h3>
                <div className={styles.infoGrid}>
                  <div className={styles.infoItem}>
                    <label>Website</label>
                    {isEditing ? (
                      <input
                        type="url"
                        value={editFormData.website || ''}
                        onChange={(e) => setEditFormData({ ...editFormData, website: e.target.value })}
                        className={styles.editInput}
                        placeholder="https://example.com"
                      />
                    ) : selectedCompany.website ? (
                      <a href={selectedCompany.website} target="_blank" rel="noopener noreferrer">
                        {selectedCompany.website}
                      </a>
                    ) : (
                      <p>Not set</p>
                    )}
                  </div>
                  <div className={styles.infoItem}>
                    <label>Description</label>
                    {isEditing ? (
                      <textarea
                        value={editFormData.description || ''}
                        onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                        className={styles.editTextarea}
                        rows={3}
                        placeholder="Company description..."
                      />
                    ) : (
                      <p>{selectedCompany.description || 'No description'}</p>
                    )}
                  </div>
                  <div className={styles.infoItem}>
                    <label>Onboarding Date</label>
                    <p>{selectedCompany.onboarding_date ? new Date(selectedCompany.onboarding_date).toLocaleDateString() : 'Not set'}</p>
                  </div>
                  <div className={styles.infoItem}>
                    <label>Status</label>
                    {isEditing ? (
                      <label className={styles.checkboxLabel}>
                        <input
                          type="checkbox"
                          checked={editFormData.is_active ?? selectedCompany.is_active}
                          onChange={(e) => setEditFormData({ ...editFormData, is_active: e.target.checked })}
                        />
                        Active
                      </label>
                    ) : (
                      <span className={`${styles.statusBadge} ${selectedCompany.is_active ? styles.active : styles.inactive}`}>
                        {selectedCompany.is_active ? 'Active' : 'Inactive'}
                      </span>
                    )}
                  </div>
                </div>
              </section>

              {/* Contact Information */}
              <section className={styles.detailsSection}>
                <h3 className={styles.sectionTitle}>Contact Information</h3>
                <div className={styles.infoGrid}>
                  <div className={styles.infoItem}>
                    <label>Primary Contact</label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={editFormData.primary_contact_name || ''}
                        onChange={(e) => setEditFormData({ ...editFormData, primary_contact_name: e.target.value })}
                        className={styles.editInput}
                        placeholder="Contact name"
                      />
                    ) : (
                      <p>{selectedCompany.primary_contact_name || 'Not set'}</p>
                    )}
                  </div>
                  <div className={styles.infoItem}>
                    <label>Email</label>
                    {isEditing ? (
                      <input
                        type="email"
                        value={editFormData.primary_contact_email || ''}
                        onChange={(e) => setEditFormData({ ...editFormData, primary_contact_email: e.target.value })}
                        className={styles.editInput}
                        placeholder="email@example.com"
                      />
                    ) : (
                      <p>{selectedCompany.primary_contact_email || 'Not set'}</p>
                    )}
                  </div>
                  <div className={styles.infoItem}>
                    <label>Phone</label>
                    {isEditing ? (
                      <input
                        type="tel"
                        value={editFormData.phone || ''}
                        onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                        className={styles.editInput}
                        placeholder="(555) 555-5555"
                      />
                    ) : (
                      <p>{selectedCompany.phone || 'Not set'}</p>
                    )}
                  </div>
                </div>
              </section>

              {/* Subscription & Usage */}
              <section className={styles.detailsSection}>
                <h3 className={styles.sectionTitle}>Subscription & Usage</h3>
                <div className={styles.infoGrid}>
                  <div className={styles.infoItem}>
                    <label>Subscription Tier</label>
                    {isEditing ? (
                      <select
                        value={editFormData.subscription_tier || selectedCompany.subscription_tier}
                        onChange={(e) => handleTierChange(e.target.value)}
                        className={styles.editSelect}
                      >
                        <option value="starter">Starter</option>
                        <option value="growth">Growth</option>
                        <option value="enterprise">Enterprise</option>
                      </select>
                    ) : (
                      <span className={`${styles.tierBadge} ${styles[`tier${selectedCompany.subscription_tier.charAt(0).toUpperCase() + selectedCompany.subscription_tier.slice(1)}`]}`}>
                        {selectedCompany.subscription_tier}
                      </span>
                    )}
                  </div>
                  <div className={styles.infoItem}>
                    <label>Monthly Limit</label>
                    {isEditing ? (
                      <input
                        type="number"
                        value={editFormData.max_candidates_per_month ?? selectedCompany.max_candidates_per_month ?? 0}
                        onChange={(e) => setEditFormData({ ...editFormData, max_candidates_per_month: parseInt(e.target.value) })}
                        className={styles.editInput}
                        min={1}
                      />
                    ) : (
                      <p>{selectedCompany.max_candidates_per_month || 0} candidates</p>
                    )}
                  </div>
                  <div className={styles.infoItem}>
                    <label>Used This Month</label>
                    <p>{selectedCompany.candidates_sent_this_month || 0} / {selectedCompany.max_candidates_per_month || 0}</p>
                    <div className={styles.usageBar}>
                      <div 
                        className={styles.usageProgress} 
                        style={{ 
                          width: `${selectedCompany.max_candidates_per_month ? ((selectedCompany.candidates_sent_this_month || 0) / selectedCompany.max_candidates_per_month) * 100 : 0}%` 
                        }}
                      />
                    </div>
                  </div>
                  <div className={styles.infoItem}>
                    <label>Billing Status</label>
                    {isEditing ? (
                      <select
                        value={editFormData.billing_status || selectedCompany.billing_status || 'current'}
                        onChange={(e) => setEditFormData({ ...editFormData, billing_status: e.target.value as BillingStatus })}
                        className={styles.editSelect}
                      >
                        <option value="current">Current</option>
                        <option value="overdue">Overdue</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    ) : (
                      <span className={`${styles.billingBadge} ${styles[`billing${(selectedCompany.billing_status || 'current').charAt(0).toUpperCase() + (selectedCompany.billing_status || 'current').slice(1)}`]}`}>
                        {selectedCompany.billing_status || 'current'}
                      </span>
                    )}
                  </div>
                </div>
              </section>

              {/* Statistics */}
              <section className={styles.detailsSection}>
                <h3 className={styles.sectionTitle}>Statistics</h3>
                <div className={styles.statsGrid}>
                  <div className={styles.statCard}>
                    <div className={styles.statValue}>{companyStats.totalCandidatesSent}</div>
                    <div className={styles.statLabel}>Total Candidates Sent</div>
                  </div>
                  <div className={styles.statCard}>
                    <div className={styles.statValue}>{companyStats.totalInterviews}</div>
                    <div className={styles.statLabel}>Interviews Scheduled</div>
                  </div>
                  <div className={styles.statCard}>
                    <div className={styles.statValue}>{companyStats.totalHires}</div>
                    <div className={styles.statLabel}>Total Hires</div>
                  </div>
                  <div className={styles.statCard}>
                    <div className={styles.statValue}>{companyStats.successRate}%</div>
                    <div className={styles.statLabel}>Success Rate</div>
                  </div>
                </div>
              </section>

              {/* Job Postings */}
              <section className={styles.detailsSection}>
                <h3 className={styles.sectionTitle}>Job Postings ({companyRequirements.length})</h3>
                {companyRequirements.length === 0 ? (
                  <p className={styles.emptyState}>No job postings yet</p>
                ) : (
                  <div className={styles.requirementsList}>
                    {companyRequirements.map(req => (
                      <div key={req.id} className={styles.requirementItem}>
                        <div>
                          <div className={styles.requirementTitle}>{req.position_title}</div>
                          <div className={styles.requirementMeta}>
                            {req.tech_stack?.slice(0, 3).map(tech => (
                              <span key={tech} className={styles.techTag}>{tech}</span>
                            ))}
                            {req.tech_stack?.length > 3 && (
                              <span className={styles.techTag}>+{req.tech_stack.length - 3} more</span>
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
              <section className={styles.detailsSection}>
                <h3 className={styles.sectionTitle}>Recent Activity</h3>
                {recentActivity.length === 0 ? (
                  <p className={styles.emptyState}>No recent activity</p>
                ) : (
                  <div className={styles.activityList}>
                    {recentActivity.map(activity => (
                      <div key={activity.id} className={styles.activityItem}>
                        <div className={styles.activityIcon}>
                          {getStatusIcon(activity.status)}
                        </div>
                        <div className={styles.activityContent}>
                          <div className={styles.activityText}>
                            <strong>{activity.students?.first_name} {activity.students?.last_name}</strong>
                            {' '}for{' '}
                            <strong>{activity.company_requirements?.position_title}</strong>
                          </div>
                          <div className={styles.activityStatus}>
                            <span className={`${styles.statusBadge} ${styles[activity.status.replace('_', '')]}`}>
                              {activity.status.replace('_', ' ')}
                            </span>
                            <span className={styles.activityDate}>
                              {new Date(activity.created_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {/* Internal Notes */}
              <section className={styles.detailsSection}>
                <h3 className={styles.sectionTitle}>Internal Notes</h3>
                {isEditing ? (
                  <textarea
                    value={editFormData.notes || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, notes: e.target.value })}
                    className={styles.editTextarea}
                    rows={4}
                    placeholder="Private notes about this company..."
                  />
                ) : (
                  <p className={styles.notesText}>{selectedCompany.notes || 'No notes'}</p>
                )}
              </section>
            </>
          ) : (
            <div className={styles.emptyState}>Select a company to view details</div>
          )}
        </div>
      </div>

    </div>
  );
}

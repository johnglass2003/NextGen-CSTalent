'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/auth-helpers-nextjs';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import styles from './company-detail.module.css';

type Company = {
  id: string;
  company_name: string;
  industry: string | null;
  company_size: string | null;
  website: string | null;
  headquarters_location: string | null;
  description: string | null;
  primary_contact_name: string | null;
  primary_contact_email: string | null;
  primary_contact_phone: string | null;
  linkedin_url: string | null;
  logo_url: string | null;
  founded_year: number | null;
  is_verified: boolean | null;
  created_at: string;
  updated_at: string;
};

export default function CompanyDetailPage() {
  const params = useParams();
  const router = useRouter();
  const companyId = params.id as string;

  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);

  useEffect(() => {
    fetchCompanyData();
  }, [companyId]);

  async function fetchCompanyData() {
    try {
      setLoading(true);

      const { data: companyData, error: companyError } = await supabase
        .from('companies')
        .select('*')
        .eq('id', companyId)
        .single();

      if (companyError) {
        throw new Error(`Company not found: ${companyError.message}`);
      }

      setCompany(companyData);
      setLoading(false);

    } catch (err: any) {
      console.error('Error fetching company:', err);
      setError(err.message);
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <ProtectedRoute allowedRoles={['internal']}>
        <div className={styles.container}>
          <div className={styles.loading}>Loading company profile...</div>
        </div>
      </ProtectedRoute>
    );
  }

  if (error || !company) {
    return (
      <ProtectedRoute allowedRoles={['internal']}>
        <div className={styles.container}>
          <div className={styles.error}>
            <h2>Error</h2>
            <p>{error || 'Company not found'}</p>
            <button onClick={() => router.push('/internal/companies')} className={styles.backButton}>
              ← Back to Companies
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
          <button onClick={() => router.push('/internal/companies')} className={styles.backButton}>
            ← Back to Companies
          </button>
          <h1>Company Profile</h1>
        </div>

        <div className={styles.profileLayout}>
          {/* Left Column: Main Info */}
          <div className={styles.mainColumn}>
            {/* Company Header Card */}
            <div className={styles.card}>
              <div className={styles.companyHeader}>
                <div className={styles.logo}>
                  {company.logo_url ? (
                    <img src={company.logo_url} alt={company.company_name} />
                  ) : (
                    <div className={styles.logoPlaceholder}>
                      {company.company_name.substring(0, 2).toUpperCase()}
                    </div>
                  )}
                </div>
                <div className={styles.companyInfo}>
                  <div className={styles.titleRow}>
                    <h2>{company.company_name}</h2>
                    {company.is_verified && (
                      <span className={styles.verifiedBadge}>✓ Verified</span>
                    )}
                  </div>
                  {company.industry && (
                    <p className={styles.industry}>🏢 {company.industry}</p>
                  )}
                  {company.headquarters_location && (
                    <p className={styles.location}>📍 {company.headquarters_location}</p>
                  )}
                  {company.website && (
                    <a 
                      href={company.website.startsWith('http') ? company.website : `https://${company.website}`}
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className={styles.websiteLink}
                    >
                      🌐 Visit Website
                    </a>
                  )}
                </div>
              </div>

              {company.description && (
                <div className={styles.section}>
                  <h3>About the Company</h3>
                  <p className={styles.description}>{company.description}</p>
                </div>
              )}
            </div>

            {/* Company Details Card */}
            <div className={styles.card}>
              <h3>Company Details</h3>
              <div className={styles.detailsGrid}>
                {company.company_size && (
                  <div className={styles.detailItem}>
                    <span className={styles.detailIcon}>👥</span>
                    <div>
                      <div className={styles.detailLabel}>Company Size</div>
                      <div className={styles.detailValue}>{company.company_size}</div>
                    </div>
                  </div>
                )}
                {company.founded_year && (
                  <div className={styles.detailItem}>
                    <span className={styles.detailIcon}>📅</span>
                    <div>
                      <div className={styles.detailLabel}>Founded</div>
                      <div className={styles.detailValue}>{company.founded_year}</div>
                    </div>
                  </div>
                )}
                {company.industry && (
                  <div className={styles.detailItem}>
                    <span className={styles.detailIcon}>🏭</span>
                    <div>
                      <div className={styles.detailLabel}>Industry</div>
                      <div className={styles.detailValue}>{company.industry}</div>
                    </div>
                  </div>
                )}
                {company.headquarters_location && (
                  <div className={styles.detailItem}>
                    <span className={styles.detailIcon}>🗺️</span>
                    <div>
                      <div className={styles.detailLabel}>Headquarters</div>
                      <div className={styles.detailValue}>{company.headquarters_location}</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Contact & Actions */}
          <div className={styles.sidebar}>
            {/* Primary Contact Card */}
            <div className={styles.card}>
              <h3>Primary Contact</h3>
              <div className={styles.contactList}>
                {company.primary_contact_name && (
                  <div className={styles.contactItem}>
                    <span className={styles.contactLabel}>Name</span>
                    <span className={styles.contactValue}>{company.primary_contact_name}</span>
                  </div>
                )}
                {company.primary_contact_email && (
                  <div className={styles.contactItem}>
                    <span className={styles.contactLabel}>Email</span>
                    <a href={`mailto:${company.primary_contact_email}`} className={styles.contactValueLink}>
                      {company.primary_contact_email}
                    </a>
                  </div>
                )}
                {company.primary_contact_phone && (
                  <div className={styles.contactItem}>
                    <span className={styles.contactLabel}>Phone</span>
                    <a href={`tel:${company.primary_contact_phone}`} className={styles.contactValueLink}>
                      {company.primary_contact_phone}
                    </a>
                  </div>
                )}
              </div>
            </div>

            {/* Links Card */}
            {(company.website || company.linkedin_url) && (
              <div className={styles.card}>
                <h3>Links</h3>
                <div className={styles.linksList}>
                  {company.website && (
                    <a 
                      href={company.website.startsWith('http') ? company.website : `https://${company.website}`}
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className={styles.link}
                    >
                      🌐 Company Website
                    </a>
                  )}
                  {company.linkedin_url && (
                    <a href={company.linkedin_url} target="_blank" rel="noopener noreferrer" className={styles.link}>
                      🔗 LinkedIn Page
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* Account Info Card */}
            <div className={styles.card}>
              <h3>Account Info</h3>
              <div className={styles.metadataList}>
                <div className={styles.metadataItem}>
                  <span className={styles.metadataLabel}>Status</span>
                  <span className={styles.metadataValue}>
                    {company.is_verified ? (
                      <span className={styles.verifiedStatus}>✓ Verified</span>
                    ) : (
                      <span className={styles.unverifiedStatus}>⏳ Pending</span>
                    )}
                  </span>
                </div>
                <div className={styles.metadataItem}>
                  <span className={styles.metadataLabel}>Member Since</span>
                  <span className={styles.metadataValue}>
                    {new Date(company.created_at).toLocaleDateString()}
                  </span>
                </div>
                <div className={styles.metadataItem}>
                  <span className={styles.metadataLabel}>Last Updated</span>
                  <span className={styles.metadataValue}>
                    {new Date(company.updated_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Actions Card */}
            <div className={styles.card}>
              <h3>Actions</h3>
              <div className={styles.actionButtons}>
                <button
                  onClick={() => router.push(`/internal/messages?company=${companyId}`)}
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
                {!company.is_verified && (
                  <button
                    onClick={async () => {
                      if (confirm('Mark this company as verified?')) {
                        await supabase
                          .from('companies')
                          .update({ is_verified: true })
                          .eq('id', companyId);
                        fetchCompanyData();
                      }
                    }}
                    className={styles.actionButtonPrimary}
                  >
                    ✓ Verify Company
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}

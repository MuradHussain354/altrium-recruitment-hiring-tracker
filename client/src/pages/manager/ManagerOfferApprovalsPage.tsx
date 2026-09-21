import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiClient } from '../../api/apiClient';
import { decideOfferApproval } from '../../api/batch2.api';
import { CheckCircle2, XCircle, AlertCircle, Briefcase, DollarSign, Calendar, FileText } from 'lucide-react';

interface OfferApprovalItem {
  id: string;
  applicationId: string;
  salaryOffered?: number | null;
  startDate?: string | null;
  notes?: string | null;
  decision: 'Pending' | 'Approved' | 'Rejected';
  decisionNotes?: string | null;
  requestedAt: string;
  decidedAt?: string | null;
  application?: {
    id: string;
    candidate?: { name: string; email: string };
    position?: { title: string; department: string };
    status: string;
  };
}

export const ManagerOfferApprovalsPage: React.FC = () => {
  const [offers, setOffers] = useState<OfferApprovalItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'Pending' | 'Approved' | 'Rejected' | 'all'>('Pending');

  // Decision modal state
  const [decidingOffer, setDecidingOffer] = useState<OfferApprovalItem | null>(null);
  const [decisionType, setDecisionType] = useState<'Approved' | 'Rejected'>('Approved');
  const [decisionNotes, setDecisionNotes] = useState('');
  const [isDeciding, setIsDeciding] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const loadOffers = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await apiClient.get<{ data: OfferApprovalItem[] }>('/offer-approvals');
      setOffers(res.data || []);
    } catch (err: any) {
      setError(err?.message || 'Failed to load offer approvals.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { loadOffers(); }, []);

  const filteredOffers = offers.filter((o) => filter === 'all' || o.decision === filter);

  const handleDecide = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!decidingOffer) return;
    setIsDeciding(true);
    setActionError(null);
    try {
      await decideOfferApproval(decidingOffer.applicationId, {
        decision: decisionType,
        notes: decisionNotes || undefined,
      });
      setSuccessMsg(`Offer ${decisionType === 'Approved' ? 'approved' : 'rejected'} successfully.`);
      setDecidingOffer(null);
      setDecisionNotes('');
      await loadOffers();
    } catch (err: any) {
      setActionError(err?.message || 'Failed to record decision.');
    } finally {
      setIsDeciding(false);
    }
  };

  const FILTER_TABS: { key: typeof filter; label: string }[] = [
    { key: 'Pending', label: '⏳ Pending' },
    { key: 'Approved', label: '✅ Approved' },
    { key: 'Rejected', label: '❌ Rejected' },
    { key: 'all', label: '🗂 All' },
  ];

  const pendingCount = offers.filter((o) => o.decision === 'Pending').length;

  return (
    <div>
      {/* Header */}
      <div className="glass-card" style={{ padding: '28px 32px', marginBottom: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
          <CheckCircle2 size={28} color="var(--accent-emerald)" />
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
            Offer Approvals
          </h1>
          {pendingCount > 0 && (
            <span style={{
              background: 'rgba(239,68,68,0.15)',
              color: '#f87171',
              border: '1px solid rgba(239,68,68,0.3)',
              borderRadius: '999px',
              padding: '2px 10px',
              fontSize: '0.8rem',
              fontWeight: 700,
            }}>
              {pendingCount} pending
            </span>
          )}
        </div>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: 0 }}>
          Review and decide on HR-submitted job offer proposals before extending offers to candidates.
        </p>
      </div>

      {successMsg && (
        <div style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: '8px', padding: '12px 16px', marginBottom: '20px', color: '#34d399', fontSize: '0.875rem' }}>
          ✓ {successMsg}
        </div>
      )}
      {error && (
        <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', padding: '12px 16px', marginBottom: '20px', color: '#f87171', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: '4px', borderBottom: '1px solid var(--border-subtle, rgba(255,255,255,0.08))', marginBottom: '24px' }}>
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            style={{
              padding: '10px 18px',
              fontSize: '0.85rem',
              fontWeight: filter === tab.key ? 700 : 500,
              color: filter === tab.key ? 'var(--primary)' : 'var(--text-muted)',
              background: 'none',
              border: 'none',
              borderBottom: filter === tab.key ? '2px solid var(--primary)' : '2px solid transparent',
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading offer approvals...</div>
      ) : filteredOffers.length === 0 ? (
        <div className="glass-card" style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--text-subtle)' }}>
          {filter === 'Pending' ? 'No pending offers awaiting approval.' : `No ${filter === 'all' ? '' : filter.toLowerCase() + ' '}offer records found.`}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {filteredOffers.map((offer) => (
            <div key={offer.id} className="glass-card" style={{
              padding: '20px 24px',
              borderLeft: offer.decision === 'Approved' ? '4px solid #10b981' : offer.decision === 'Rejected' ? '4px solid #ef4444' : '4px solid #f59e0b',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                <div style={{ flex: 1 }}>
                  {/* Candidate & position */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>
                      {offer.application?.candidate?.name || 'Candidate'}
                    </h3>
                    <span className={`badge ${
                      offer.decision === 'Approved' ? 'badge-emerald' :
                      offer.decision === 'Rejected' ? 'badge-amber' :
                      'badge-cyan'
                    }`} style={{ fontSize: '0.72rem' }}>
                      {offer.decision}
                    </span>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    {offer.application?.position && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Briefcase size={14} /> {offer.application.position.title} · {offer.application.position.department}
                      </span>
                    )}
                    {offer.salaryOffered && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <DollarSign size={14} /> Proposed: <strong style={{ color: 'var(--text-main)' }}>${offer.salaryOffered.toLocaleString()}</strong>
                      </span>
                    )}
                    {offer.startDate && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Calendar size={14} /> Start: <strong style={{ color: 'var(--text-main)' }}>{new Date(offer.startDate).toLocaleDateString()}</strong>
                      </span>
                    )}
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <FileText size={14} /> Requested: {new Date(offer.requestedAt).toLocaleDateString()}
                    </span>
                  </div>
                  {offer.notes && (
                    <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '8px 0 0 0', fontStyle: 'italic' }}>
                      HR notes: "{offer.notes}"
                    </p>
                  )}
                  {offer.decisionNotes && (
                    <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '8px 0 0 0' }}>
                      Decision notes: "{offer.decisionNotes}"
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                  {offer.application?.id && (
                    <Link to={`/hr/applications/${offer.application.id}`} className="btn btn-sm btn-secondary" style={{ fontSize: '0.8rem' }}>
                      View Application
                    </Link>
                  )}
                  {offer.decision === 'Pending' && (
                    <>
                      <button
                        className="btn btn-sm btn-primary"
                        onClick={() => { setDecidingOffer(offer); setDecisionType('Approved'); setDecisionNotes(''); setActionError(null); }}
                        style={{ background: '#10b981', borderColor: '#10b981', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                      >
                        <CheckCircle2 size={14} /> Approve
                      </button>
                      <button
                        className="btn btn-sm btn-secondary"
                        onClick={() => { setDecidingOffer(offer); setDecisionType('Rejected'); setDecisionNotes(''); setActionError(null); }}
                        style={{ borderColor: 'rgba(239,68,68,0.5)', color: '#f87171', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                      >
                        <XCircle size={14} /> Reject
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Decision Modal */}
      {decidingOffer && (
        <div className="global-search-backdrop" style={{ zIndex: 1000 }}>
          <div className="glass-card" style={{ maxWidth: '500px', width: '90%', padding: '28px', background: '#0f172a' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '6px' }}>
              {decisionType === 'Approved' ? '✅ Approve Offer' : '❌ Reject Offer'}
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
              {decisionType === 'Approved'
                ? 'Approving this offer will allow HR to extend a formal offer to the candidate. The application status remains unchanged until HR marks it as Hired.'
                : 'Rejecting this offer will inform HR to reassess or renegotiate terms before resubmitting.'
              }
            </p>
            <div style={{ padding: '12px 16px', borderRadius: '8px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-subtle)', marginBottom: '16px', fontSize: '0.85rem' }}>
              <strong style={{ color: 'var(--text-main)' }}>{decidingOffer.application?.candidate?.name}</strong>
              {decidingOffer.application?.position && <span style={{ color: 'var(--text-muted)', marginLeft: '8px' }}>— {decidingOffer.application.position.title}</span>}
              {decidingOffer.salaryOffered && <div style={{ color: 'var(--text-muted)', marginTop: '4px' }}>Proposed salary: ${decidingOffer.salaryOffered.toLocaleString()}</div>}
            </div>
            {actionError && (
              <div style={{ color: '#f87171', fontSize: '0.85rem', marginBottom: '12px' }}>⚠ {actionError}</div>
            )}
            <form onSubmit={handleDecide}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '6px' }}>
                  Decision Notes (optional)
                </label>
                <textarea
                  rows={3}
                  className="input-field"
                  placeholder="Any notes or conditions to communicate to HR..."
                  value={decisionNotes}
                  onChange={(e) => setDecisionNotes(e.target.value)}
                  style={{ width: '100%', resize: 'vertical' }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setDecidingOffer(null)} disabled={isDeciding}>
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isDeciding}
                  style={decisionType === 'Rejected' ? { background: '#ef4444', borderColor: '#ef4444' } : { background: '#10b981', borderColor: '#10b981' }}
                >
                  {isDeciding ? 'Saving...' : decisionType === 'Approved' ? '✅ Confirm Approval' : '❌ Confirm Rejection'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManagerOfferApprovalsPage;

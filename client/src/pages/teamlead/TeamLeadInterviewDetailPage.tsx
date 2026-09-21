import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { teamLeadInterviewsApi } from '../../api/teamLeadInterviews.api';
import { teamLeadFeedbackApi } from '../../api/teamLeadFeedback.api';
import { TLInterviewDetail, TLFeedbackItem } from '../../types/teamlead';
import { useAuth } from '../../auth/AuthContext';
import { FeedbackSubmitModal } from '../../components/teamlead/FeedbackSubmitModal';
import { OwnFeedbackView } from '../../components/teamlead/OwnFeedbackView';
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Video,
  User,
  Mail,
  Phone,
  Briefcase,
  Layers,
  Users,
  MessageSquarePlus,
  ShieldAlert,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Share2,
  HelpCircle,
} from 'lucide-react';
import { respondToInvitation, delegateInterview } from '../../api/batch2.api';
import { hrLookupsApi } from '../../api/hrLookups.api';

export const TeamLeadInterviewDetailPage: React.FC = () => {
  const { interviewId } = useParams<{ interviewId: string }>();
  const { user } = useAuth();

  const [interview, setInterview] = useState<TLInterviewDetail | null>(null);
  const [ownFeedback, setOwnFeedback] = useState<TLFeedbackItem | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [is403Forbidden, setIs403Forbidden] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState<boolean>(false);

  // S2-19 & S2-21 states
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [isDeclineModalOpen, setIsDeclineModalOpen] = useState<boolean>(false);
  const [declineReason, setDeclineReason] = useState<string>('');
  const [isDelegateModalOpen, setIsDelegateModalOpen] = useState<boolean>(false);
  const [delegateTargetId, setDelegateTargetId] = useState<string>('');
  const [eligiblePeers, setEligiblePeers] = useState<Array<{ id: string; name: string; email: string }>>([]);

  const loadData = async () => {
    if (!interviewId) return;
    try {
      setIsLoading(true);
      setError(null);
      setIs403Forbidden(false);

      // 1. Load interview details
      const detailRes = await teamLeadInterviewsApi.getMyInterview(interviewId);
      setInterview(detailRes.data);

      // 2. Load own feedback if assigned
      try {
        const fbRes = await teamLeadFeedbackApi.getMyFeedback(interviewId);
        if (fbRes.data && fbRes.data.length > 0) {
          setOwnFeedback(fbRes.data[0]);
        } else {
          setOwnFeedback(null);
        }
      } catch {
        // Feedback check non-fatal if 404/empty
        setOwnFeedback(null);
      }

      setIsLoading(false);
    } catch (err: any) {
      setIsLoading(false);
      if (err.error === 'ForbiddenError' || err.message?.includes('Access denied')) {
        setIs403Forbidden(true);
      } else {
        setError(err.message || 'Failed to load interview details.');
      }
    }
  };

  useEffect(() => {
    loadData();
  }, [interviewId]);

  if (isLoading) {
    return (
      <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>
        Loading evaluation assignment details...
      </div>
    );
  }

  if (is403Forbidden) {
    return (
      <div className="glass-card" style={{ padding: '48px 32px', textAlign: 'center', maxWidth: '600px', margin: '40px auto' }}>
        <ShieldAlert size={48} color="var(--accent-amber)" style={{ marginBottom: '16px' }} />
        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '8px' }}>
          Access Denied
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginBottom: '24px', lineHeight: 1.6 }}>
          You are not assigned as an interviewer for this candidate interview session. Access is restricted to assigned technical interviewers only.
        </p>
        <Link to="/team-lead/interviews" className="btn btn-primary">
          Back to Assigned Interviews
        </Link>
      </div>
    );
  }

  if (error || !interview) {
    return (
      <div className="glass-card" style={{ padding: '32px', textAlign: 'center' }}>
        <AlertCircle size={36} color="var(--accent-amber)" style={{ marginBottom: '12px' }} />
        <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '8px' }}>
          Interview Not Found
        </h3>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '20px' }}>
          {error || 'Unable to retrieve interview details.'}
        </p>
        <Link to="/team-lead/interviews" className="btn btn-secondary">
          <ArrowLeft size={16} /> Return to List
        </Link>
      </div>
    );
  }

  const myAssignment = interview?.assignments.find((a) => a.interviewer.id === user?.id);
  const isFeedbackAlreadySubmitted = myAssignment?.feedbackSubmitted || ownFeedback !== null;
  const invitationStatus = myAssignment?.invitationStatus || 'Pending';

  const handleAccept = async () => {
    if (!interviewId) return;
    try {
      setActionLoading(true);
      setActionError(null);
      await respondToInvitation(interviewId, 'Accepted');
      setActionSuccess('Interview invitation accepted.');
      await loadData();
    } catch (err: any) {
      setActionError(err.message || 'Failed to accept invitation.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDecline = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!interviewId) return;
    if (!declineReason.trim()) {
      setActionError('Please provide a reason for declining.');
      return;
    }
    try {
      setActionLoading(true);
      setActionError(null);
      await respondToInvitation(interviewId, 'Declined', declineReason.trim());
      setIsDeclineModalOpen(false);
      setDeclineReason('');
      setActionSuccess('Interview invitation declined.');
      await loadData();
    } catch (err: any) {
      setActionError(err.message || 'Failed to decline invitation.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelegate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!interviewId) return;
    if (!delegateTargetId.trim()) {
      setActionError('Please provide the target Team Lead user ID.');
      return;
    }
    try {
      setActionLoading(true);
      setActionError(null);
      await delegateInterview(interviewId, delegateTargetId.trim());
      setIsDelegateModalOpen(false);
      setDelegateTargetId('');
      setActionSuccess('Interview successfully delegated to peer Team Lead.');
      await loadData();
    } catch (err: any) {
      setActionError(err.message || 'Failed to delegate interview.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenDelegate = async () => {
    setIsDelegateModalOpen(true);
    setActionError(null);
    try {
      const res = await hrLookupsApi.listEligibleInterviewers();
      const peers = (res.data || []).filter((u: any) => u.role === 'TeamLead' && u.id !== user?.id);
      setEligiblePeers(peers);
    } catch {
      // ignore
    }
  };

  const formattedDate = interview?.scheduledAt
    ? new Date(interview.scheduledAt).toLocaleString(undefined, {
        dateStyle: 'full',
        timeStyle: 'short'
      })
    : 'Not scheduled';

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
      {/* Back Link & Header */}
      <div style={{ marginBottom: '20px' }}>
        <Link to="/team-lead/interviews" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)', fontSize: '0.85rem', textDecoration: 'none', marginBottom: '12px' }}>
          <ArrowLeft size={16} /> Back to Assigned Interviews
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
              <h1 style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
                {interview.application.candidate.name}
              </h1>
              <span className={`badge ${interview.status === 'Completed' ? 'badge-emerald' : 'badge-cyan'}`}>
                {interview.status}
              </span>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: 0 }}>
              Technical Evaluation for <strong>{interview.application.position.title}</strong>
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            {!isFeedbackAlreadySubmitted && (
              <>
                <button
                  type="button"
                  onClick={handleOpenDelegate}
                  className="btn btn-secondary"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}
                >
                  <Share2 size={16} /> Delegate Interview
                </button>

                <button
                  onClick={() => setIsSubmitModalOpen(true)}
                  className="btn btn-primary"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 20px', fontSize: '0.9rem' }}
                >
                  <MessageSquarePlus size={18} /> Submit Evaluation Feedback
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* S2-19: Invitation Status & Action Banner */}
      {myAssignment && (
        <div className="glass-card" style={{
          padding: '16px 20px',
          marginBottom: '24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          borderLeft: invitationStatus === 'Accepted' ? '4px solid #10b981' : invitationStatus === 'Declined' ? '4px solid #ef4444' : '4px solid #f59e0b',
          backgroundColor: invitationStatus === 'Accepted' ? 'rgba(16, 185, 129, 0.05)' : invitationStatus === 'Declined' ? 'rgba(239, 68, 68, 0.05)' : 'rgba(245, 158, 11, 0.08)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {invitationStatus === 'Accepted' ? (
              <CheckCircle2 size={20} color="#10b981" />
            ) : invitationStatus === 'Declined' ? (
              <XCircle size={20} color="#ef4444" />
            ) : (
              <AlertCircle size={20} color="#f59e0b" />
            )}
            <div>
              <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-main)' }}>
                Interview Assignment Invitation: <span style={{ textTransform: 'uppercase', letterSpacing: '0.5px' }}>{invitationStatus}</span>
              </span>
              <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                {invitationStatus === 'Accepted' && 'You have confirmed your attendance for this technical evaluation session.'}
                {invitationStatus === 'Declined' && `You declined this session. Reason: ${myAssignment.declineReason || 'Not specified'}`}
                {invitationStatus === 'Pending' && 'Please confirm your availability or decline/delegate if you cannot attend.'}
              </p>
            </div>
          </div>

          {invitationStatus === 'Pending' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                type="button"
                onClick={handleAccept}
                disabled={actionLoading}
                className="btn btn-primary"
                style={{ fontSize: '0.825rem', padding: '6px 14px', display: 'flex', alignItems: 'center', gap: '4px', backgroundColor: '#10b981', borderColor: '#10b981' }}
              >
                <CheckCircle2 size={15} /> Accept Invitation
              </button>
              <button
                type="button"
                onClick={() => setIsDeclineModalOpen(true)}
                disabled={actionLoading}
                className="btn btn-secondary"
                style={{ fontSize: '0.825rem', padding: '6px 14px', display: 'flex', alignItems: 'center', gap: '4px', borderColor: 'rgba(239, 68, 68, 0.5)', color: '#f87171' }}
              >
                <XCircle size={15} /> Decline...
              </button>
            </div>
          )}
        </div>
      )}

      {actionSuccess && (
        <div style={{ padding: '12px 16px', borderRadius: '8px', backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#34d399', marginBottom: '20px', fontSize: '0.875rem' }}>
          ✓ {actionSuccess}
        </div>
      )}

      {actionError && (
        <div style={{ padding: '12px 16px', borderRadius: '8px', backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#f87171', marginBottom: '20px', fontSize: '0.875rem' }}>
          ⚠ {actionError}
        </div>
      )}

      {/* Main Details Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px', marginBottom: '28px' }}>
        {/* Candidate & Position Card */}
        <div className="glass-card" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <User size={18} color="var(--primary)" /> Candidate & Application Info
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '0.875rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Mail size={16} color="var(--text-subtle)" />
              <span style={{ color: 'var(--text-muted)' }}>Email:</span>
              <a href={`mailto:${interview.application.candidate.email}`} style={{ color: 'var(--accent-cyan)', fontWeight: 600, textDecoration: 'none' }}>
                {interview.application.candidate.email}
              </a>
            </div>
            {interview.application.candidate.phone && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Phone size={16} color="var(--text-subtle)" />
                <span style={{ color: 'var(--text-muted)' }}>Phone:</span>
                <span style={{ color: 'var(--text-main)', fontWeight: 600 }}>{interview.application.candidate.phone}</span>
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Briefcase size={16} color="var(--text-subtle)" />
              <span style={{ color: 'var(--text-muted)' }}>Department:</span>
              <span style={{ color: 'var(--text-main)', fontWeight: 600 }}>{interview.application.position.department}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Layers size={16} color="var(--text-subtle)" />
              <span style={{ color: 'var(--text-muted)' }}>Current Stage:</span>
              <span style={{ color: 'var(--accent-emerald)', fontWeight: 600 }}>{interview.stage.name}</span>
            </div>
          </div>
        </div>

        {/* Schedule & Logistics Card */}
        <div className="glass-card" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Calendar size={18} color="var(--accent-cyan)" /> Schedule & Logistics
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '0.875rem' }}>
            <div>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-subtle)', display: 'block', marginBottom: '2px' }}>Scheduled Date & Time</span>
              <span style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)' }}>{formattedDate}</span>
            </div>
            {interview.location && (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                <MapPin size={16} color="var(--text-subtle)" style={{ marginTop: '2px' }} />
                <div>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-subtle)', display: 'block' }}>Location / Office</span>
                  <span style={{ color: 'var(--text-main)' }}>{interview.location}</span>
                </div>
              </div>
            )}
            {interview.meetingLink && (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                <Video size={16} color="var(--accent-cyan)" style={{ marginTop: '2px' }} />
                <div>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-subtle)', display: 'block' }}>Video Meeting Link</span>
                  <a href={interview.meetingLink} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-cyan)', fontWeight: 600, wordBreak: 'break-all' }}>
                    {interview.meetingLink}
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* S2-20/21: Assigned Evaluation Question Set */}
      {interview.questionSet && (
        <div className="glass-card" style={{ padding: '24px', marginBottom: '28px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <HelpCircle size={18} color="var(--accent-cyan)" /> Evaluation Question Set: {interview.questionSet.title}
            </h3>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '3px 8px', borderRadius: '4px', background: 'rgba(99,102,241,0.12)', color: 'var(--primary)' }}>
              {interview.questionSet.category}
            </span>
          </div>
          {interview.questionSet.description && (
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '16px', lineHeight: 1.5 }}>
              {interview.questionSet.description}
            </p>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {(interview.questionSet.questions || []).map((q, idx) => (
              <div
                key={q.id || idx}
                style={{
                  padding: '12px 16px',
                  borderRadius: '8px',
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                  <span style={{
                    width: '22px',
                    height: '22px',
                    borderRadius: '50%',
                    background: 'var(--primary)',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    flexShrink: 0,
                    marginTop: '2px',
                  }}>
                    {idx + 1}
                  </span>
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-main)' }}>
                      {q.questionText}
                    </p>
                    {q.guidance && (
                      <div style={{
                        marginTop: '6px',
                        padding: '6px 10px',
                        borderRadius: '6px',
                        background: 'rgba(99,102,241,0.08)',
                        borderLeft: '3px solid var(--primary)',
                        fontSize: '0.8rem',
                        color: 'var(--text-muted)',
                      }}>
                        <strong>Interviewer Guidance:</strong> {q.guidance}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Assigned Panel Members Card */}
      <div className="glass-card" style={{ padding: '24px', marginBottom: '28px' }}>
        <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Users size={18} color="var(--accent-emerald)" /> Assigned Interview Panel
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
          {interview.assignments.map((asgn) => (
            <div key={asgn.id} style={{
              padding: '12px 16px',
              borderRadius: '8px',
              backgroundColor: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid var(--border-subtle)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div>
                <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-main)' }}>
                  {asgn.interviewer.name} {asgn.interviewer.id === user?.id && '(You)'}
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  Role: {asgn.interviewer.role}
                </div>
              </div>
              <span className={`badge ${asgn.feedbackSubmitted ? 'badge-emerald' : 'badge-amber'}`} style={{ fontSize: '0.72rem' }}>
                {asgn.feedbackSubmitted ? 'Submitted' : 'Pending'}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Feedback Section */}
      <div style={{ marginBottom: '40px' }}>
        <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '16px' }}>
          Your Technical Evaluation
        </h3>

        {ownFeedback ? (
          <OwnFeedbackView feedback={ownFeedback} />
        ) : (
          <div className="glass-card" style={{ padding: '32px', textAlign: 'center' }}>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '16px' }}>
              You have not submitted your technical evaluation for this interview yet.
            </p>
            <button
              onClick={() => setIsSubmitModalOpen(true)}
              className="btn btn-primary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
            >
              <MessageSquarePlus size={18} /> Submit Evaluation Feedback Now
            </button>
          </div>
        )}
      </div>

      {/* Decline Invitation Modal */}
      {isDeclineModalOpen && (
        <div className="global-search-backdrop" style={{ zIndex: 1000 }}>
          <div className="glass-card" style={{ maxWidth: '480px', width: '90%', padding: '24px', backgroundColor: '#0f172a' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '8px' }}>
              Decline Interview Invitation
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
              Please provide a clear reason for declining this evaluation session so HR can reassign the candidate.
            </p>
            <form onSubmit={handleDecline}>
              <textarea
                rows={3}
                required
                className="input-field"
                placeholder="Reason (e.g. Schedule conflict, out of office, domain mismatch)..."
                value={declineReason}
                onChange={(e) => setDeclineReason(e.target.value)}
                style={{ width: '100%', marginBottom: '16px' }}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setIsDeclineModalOpen(false)}
                  className="btn btn-secondary"
                  disabled={actionLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={actionLoading || !declineReason.trim()}
                  style={{ backgroundColor: '#ef4444', borderColor: '#ef4444' }}
                >
                  {actionLoading ? 'Declining...' : 'Confirm Decline'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delegate Interview Modal */}
      {isDelegateModalOpen && (
        <div className="global-search-backdrop" style={{ zIndex: 1000 }}>
          <div className="glass-card" style={{ maxWidth: '480px', width: '90%', padding: '24px', backgroundColor: '#0f172a' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '8px' }}>
              Delegate Interview Assignment
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
              Transfer your evaluation responsibility to another qualified Team Lead. An audit log and notification will be created.
            </p>
            <form onSubmit={handleDelegate}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '6px' }}>
                  Select Qualified Team Lead:
                </label>
                {eligiblePeers.length > 0 ? (
                  <select
                    required
                    className="input-field"
                    value={delegateTargetId}
                    onChange={(e) => setDelegateTargetId(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px' }}
                  >
                    <option value="">-- Select Team Lead --</option>
                    {eligiblePeers.map((p) => (
                      <option key={p.id} value={p.id}>{p.name} ({p.email})</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    required
                    className="input-field"
                    placeholder="Paste Team Lead user ID..."
                    value={delegateTargetId}
                    onChange={(e) => setDelegateTargetId(e.target.value)}
                    style={{ width: '100%' }}
                  />
                )}
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setIsDelegateModalOpen(false)}
                  className="btn btn-secondary"
                  disabled={actionLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={actionLoading || !delegateTargetId.trim()}
                >
                  {actionLoading ? 'Delegating...' : 'Confirm Delegation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Submit Modal */}
      {interviewId && (
        <FeedbackSubmitModal
          interviewId={interviewId}
          isOpen={isSubmitModalOpen}
          onClose={() => setIsSubmitModalOpen(false)}
          onSuccess={loadData}
        />
      )}
    </div>
  );
};

export default TeamLeadInterviewDetailPage;

import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { hrApplicationsApi } from '../../api/hrApplications.api';
import { hrPositionsApi } from '../../api/hrPositions.api';
import { hrInterviewsApi } from '../../api/hrInterviews.api';
import { hrLookupsApi } from '../../api/hrLookups.api';
import { managerAccountsApi } from '../../api/managerAccounts.api';
import {
  Application,
  Stage,
  Interview,
  ApplicationStatus,
  ScheduleInterviewInput,
  ApplicationInternalNote,
  ApplicationTag,
  ApplicationComment,
  ConsolidatedFeedbackScorecard,
} from '../../types/hr';
import { useAuth } from '../../auth/AuthContext';
import { StatusBadge } from '../../components/hr/StatusBadge';
import {
  UpdateStatusModal,
  MoveStageModal,
  AssignTeamModal
} from '../../components/hr/ApplicationModals';
import {
  ScheduleInterviewModal,
  ViewFeedbackModal
} from '../../components/hr/InterviewModals';
import {
  getApplicationNotes,
  addApplicationNote,
  deleteApplicationNote,
  getApplicationTags,
  addApplicationTag,
  removeApplicationTag,
  getApplicationComments,
  addApplicationComment,
  deleteApplicationComment,
  getConsolidatedFeedback,
  requestOfferApproval,
} from '../../api/batch2.api';
import { Lock, MessageSquare, Tag, Plus, Check, X, ShieldAlert } from 'lucide-react';

type ActiveTab = 'details' | 'notes' | 'tags' | 'comments' | 'scorecard' | 'offer';

const TAG_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316'];

export const HRApplicationDetailPage: React.FC = () => {
  const { applicationId } = useParams<{ applicationId: string }>();
  const { user } = useAuth();

  const isNotesAllowed = user?.role === 'HR' || user?.role === 'Manager';

  const [application, setApplication] = useState<Application | null>(null);
  const [stages, setStages] = useState<Stage[]>([]);
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<ActiveTab>('details');

  // Modals
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [isStageModalOpen, setIsStageModalOpen] = useState(false);
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [selectedInterviewForFeedback, setSelectedInterviewForFeedback] = useState<Interview | null>(null);
  const [isSubmittingAction, setIsSubmittingAction] = useState(false);

  // ── S2-12 PRIVATE NOTES ──────────────────────────────────────────────────────
  const [notes, setNotes] = useState<ApplicationInternalNote[]>([]);
  const [notesLoading, setNotesLoading] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [isAddingNote, setIsAddingNote] = useState(false);

  // ── S2-15 TAGS ───────────────────────────────────────────────────────────────
  const [tags, setTags] = useState<ApplicationTag[]>([]);
  const [tagsLoading, setTagsLoading] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState(TAG_COLORS[0]);
  const [isAddingTag, setIsAddingTag] = useState(false);

  // ── S2-31/32 COMMENTS & @MENTIONS ───────────────────────────────────────────
  const [comments, setComments] = useState<ApplicationComment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [isAddingComment, setIsAddingComment] = useState(false);
  const [internalUsers, setInternalUsers] = useState<Array<{ id: string; name: string; role?: string }>>([]);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionPos, setMentionPos] = useState<number>(0);
  const commentTextareaRef = useRef<HTMLTextAreaElement>(null);

  // ── S2-17 CONSOLIDATED SCORECARD ────────────────────────────────────────────
  const [scorecard, setScorecard] = useState<ConsolidatedFeedbackScorecard | null>(null);
  const [scorecardLoading, setScorecardLoading] = useState(false);
  const [scorecardError, setScorecardError] = useState<string | null>(null);

  // ── S2-24 OFFER REQUEST ──────────────────────────────────────────────────────
  const [offerSalary, setOfferSalary] = useState('');
  const [offerStartDate, setOfferStartDate] = useState('');
  const [offerNotes, setOfferNotes] = useState('');
  const [isRequestingOffer, setIsRequestingOffer] = useState(false);

  const fetchApplicationDetails = async () => {
    if (!applicationId) return;
    setIsLoading(true);
    setError(null);
    try {
      const [appRes, intRes, tagRes] = await Promise.all([
        hrApplicationsApi.getApplication(applicationId),
        hrInterviewsApi.listInterviews({ applicationId }),
        getApplicationTags(applicationId).catch(() => [])
      ]);
      setApplication(appRes.data);
      setInterviews(intRes.data || []);
      setTags(tagRes || []);

      if (appRes.data?.positionId) {
        const stageRes = await hrPositionsApi.listStages(appRes.data.positionId);
        setStages((stageRes.data || []).sort((a, b) => a.sequenceOrder - b.sequenceOrder));
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load application details.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchApplicationDetails();
  }, [applicationId]);

  // Load internal users for @mentions
  useEffect(() => {
    const loadInternalUsers = async () => {
      try {
        if (user?.role === 'Manager') {
          const res = await managerAccountsApi.listManagedUsers();
          setInternalUsers((res.data || []).filter((u: any) => u.isActive !== false));
        } else {
          const res = await hrLookupsApi.listEligibleInterviewers();
          setInternalUsers(res.data || []);
        }
      } catch {
        try {
          const res = await hrLookupsApi.listEligibleInterviewers();
          setInternalUsers(res.data || []);
        } catch {
          setInternalUsers([]);
        }
      }
    };
    loadInternalUsers();
  }, [user?.role]);

  // Load tab-specific data on tab switch
  useEffect(() => {
    if (!applicationId) return;
    if (activeTab === 'notes' && notes.length === 0) loadNotes();
    if (activeTab === 'tags' && tags.length === 0) loadTags();
    if (activeTab === 'comments' && comments.length === 0) loadComments();
    if (activeTab === 'scorecard' && !scorecard) loadScorecard();
  }, [activeTab]);

  const loadNotes = async () => {
    if (!applicationId) return;
    setNotesLoading(true);
    try {
      const n = await getApplicationNotes(applicationId);
      setNotes(n || []);
    } catch { setNotes([]); }
    finally { setNotesLoading(false); }
  };

  const loadTags = async () => {
    if (!applicationId) return;
    setTagsLoading(true);
    try {
      const t = await getApplicationTags(applicationId);
      setTags(t || []);
    } catch { setTags([]); }
    finally { setTagsLoading(false); }
  };

  const loadComments = async () => {
    if (!applicationId) return;
    setCommentsLoading(true);
    try {
      const c = await getApplicationComments(applicationId);
      setComments(c || []);
    } catch { setComments([]); }
    finally { setCommentsLoading(false); }
  };

  const loadScorecard = async () => {
    if (!applicationId) return;
    setScorecardLoading(true);
    setScorecardError(null);
    try {
      const sc = await getConsolidatedFeedback(applicationId);
      setScorecard(sc);
    } catch (err: any) {
      setScorecardError(err?.message || 'Could not load consolidated feedback.');
    }
    finally { setScorecardLoading(false); }
  };

  // Status update
  const handleUpdateStatus = async (newStatus: ApplicationStatus, statusReason?: string) => {
    if (!applicationId) return;
    setIsSubmittingAction(true);
    try {
      const res = await hrApplicationsApi.updateStatus(applicationId, { status: newStatus, statusReason });
      setApplication((prev) => prev ? { ...prev, ...res.data } : res.data);
      setSuccessMessage(`Application status updated to ${newStatus}.`);
    } catch (err: any) { throw err; }
    finally { setIsSubmittingAction(false); }
  };

  const handleMoveStage = async (stageId: string) => {
    if (!applicationId) return;
    setIsSubmittingAction(true);
    try {
      const res = await hrApplicationsApi.moveStage(applicationId, { stageId });
      setApplication((prev) => prev ? { ...prev, ...res.data } : res.data);
      setSuccessMessage('Candidate advanced to new pipeline stage successfully.');
    } catch (err: any) { throw err; }
    finally { setIsSubmittingAction(false); }
  };

  const handleAssignTeam = async (teamId: string) => {
    if (!applicationId) return;
    setIsSubmittingAction(true);
    try {
      const res = await hrApplicationsApi.assignTeam(applicationId, { teamId });
      setApplication((prev) => prev ? { ...prev, ...res.data } : res.data);
      setSuccessMessage('Team assigned to application successfully.');
    } catch (err: any) { throw err; }
    finally { setIsSubmittingAction(false); }
  };

  const handleScheduleInterview = async (data: ScheduleInterviewInput) => {
    if (!applicationId) return;
    setIsSubmittingAction(true);
    try {
      await hrApplicationsApi.scheduleInterview(applicationId, data);
      setSuccessMessage('Interview scheduled successfully.');
      const intRes = await hrInterviewsApi.listInterviews({ applicationId });
      setInterviews(intRes.data || []);
    } catch (err: any) { throw err; }
    finally { setIsSubmittingAction(false); }
  };

  // ── NOTE ACTIONS ─────────────────────────────────────────────────────────────
  const handleAddNote = async () => {
    if (!applicationId || !newNote.trim()) return;
    setIsAddingNote(true);
    try {
      const n = await addApplicationNote(applicationId, newNote.trim());
      setNotes((prev) => [n, ...prev]);
      setNewNote('');
    } catch (err: any) { setError(err?.message || 'Failed to add note.'); }
    finally { setIsAddingNote(false); }
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!applicationId) return;
    try {
      await deleteApplicationNote(applicationId, noteId);
      setNotes((prev) => prev.filter((n) => n.id !== noteId));
    } catch (err: any) { setError(err?.message || 'Failed to delete note.'); }
  };

  // ── TAG ACTIONS ──────────────────────────────────────────────────────────────
  const handleAddTag = async () => {
    if (!applicationId || !newTagName.trim()) return;
    setIsAddingTag(true);
    try {
      const t = await addApplicationTag(applicationId, newTagName.trim(), newTagColor);
      setTags((prev) => [...prev, t]);
      setNewTagName('');
    } catch (err: any) { setError(err?.message || 'Failed to add tag.'); }
    finally { setIsAddingTag(false); }
  };

  const handleRemoveTag = async (tagId: string) => {
    if (!applicationId) return;
    try {
      await removeApplicationTag(applicationId, tagId);
      setTags((prev) => prev.filter((t) => t.id !== tagId));
    } catch (err: any) { setError(err?.message || 'Failed to remove tag.'); }
  };

  // ── COMMENT ACTIONS ──────────────────────────────────────────────────────────
  const handleCommentTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    const pos = e.target.selectionStart || 0;
    setNewComment(val);
    setMentionPos(pos);

    const textBeforeCursor = val.slice(0, pos);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');
    if (lastAtIndex !== -1) {
      const charBeforeAt = lastAtIndex > 0 ? textBeforeCursor[lastAtIndex - 1] : ' ';
      if (/\s/.test(charBeforeAt) || lastAtIndex === 0) {
        const query = textBeforeCursor.slice(lastAtIndex + 1);
        if (!query.includes('\n') && query.length <= 25) {
          setMentionQuery(query);
          return;
        }
      }
    }
    setMentionQuery(null);
  };

  const handleSelectMention = (targetUser: { id: string; name: string }) => {
    const textBeforeCursor = newComment.slice(0, mentionPos);
    const textAfterCursor = newComment.slice(mentionPos);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');
    if (lastAtIndex === -1) return;

    const beforeAt = textBeforeCursor.slice(0, lastAtIndex);
    const completedText = `${beforeAt}@${targetUser.name} ${textAfterCursor}`;
    setNewComment(completedText);
    setMentionQuery(null);
    if (commentTextareaRef.current) {
      commentTextareaRef.current.focus();
    }
  };

  const handleAddComment = async () => {
    if (!applicationId || !newComment.trim()) return;
    setIsAddingComment(true);
    try {
      const c = await addApplicationComment(applicationId, newComment.trim());
      setComments((prev) => [...prev, c]);
      setNewComment('');
      setMentionQuery(null);
    } catch (err: any) { setError(err?.message || 'Failed to add comment.'); }
    finally { setIsAddingComment(false); }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!applicationId) return;
    try {
      await deleteApplicationComment(applicationId, commentId);
      setComments((prev) => prev.filter((c) => c.id !== commentId));
    } catch (err: any) { setError(err?.message || 'Failed to delete comment.'); }
  };

  // ── OFFER REQUEST ────────────────────────────────────────────────────────────
  const handleRequestOffer = async () => {
    if (!applicationId) return;
    setIsRequestingOffer(true);
    try {
      await requestOfferApproval(applicationId, {
        salaryOffered: offerSalary ? Number(offerSalary) : undefined,
        startDate: offerStartDate || undefined,
        notes: offerNotes || undefined,
      });
      setSuccessMessage('Offer approval request submitted to Manager.');
      setOfferSalary('');
      setOfferStartDate('');
      setOfferNotes('');
    } catch (err: any) { setError(err?.message || 'Failed to request offer approval.'); }
    finally { setIsRequestingOffer(false); }
  };

  // ── RENDER HELPERS ────────────────────────────────────────────────────────────
  const renderMentions = (text: string) => {
    const parts = text.split(/(@[a-zA-Z0-9_.-]+(?:\s[a-zA-Z0-9_.-]+)?)/g);
    return parts.map((part, i) =>
      part.startsWith('@')
        ? <span key={i} style={{ color: 'var(--accent-cyan)', fontWeight: 600, backgroundColor: 'rgba(6, 182, 212, 0.1)', padding: '1px 4px', borderRadius: '4px' }}>{part}</span>
        : <span key={i}>{part}</span>
    );
  };

  const TABS: { key: ActiveTab; label: string }[] = [
    { key: 'details', label: '📋 Details & Interviews' },
    ...(isNotesAllowed ? [{ key: 'notes' as ActiveTab, label: '🔒 Private Notes' }] : []),
    { key: 'tags', label: '🏷️ Tags' },
    { key: 'comments', label: '💬 Team Comments' },
    { key: 'scorecard', label: '📊 Scorecard' },
    { key: 'offer', label: '🤝 Offer Approval' },
  ];

  if (isLoading) {
    return (
      <div className="page-container hr-application-detail-page">
        <div className="page-loading-state">
          <div className="spinner"></div>
          <p>Loading candidate application...</p>
        </div>
      </div>
    );
  }

  if (error && !application) {
    return (
      <div className="page-container hr-application-detail-page">
        <div className="page-alert page-alert--error">{error}</div>
        <Link to="/hr/applications" className="btn btn-secondary mt-3">← Back to Applications</Link>
      </div>
    );
  }

  if (!application) return null;

  return (
    <div className="page-container hr-application-detail-page">
      <div className="page-header">
        <div>
          <div className="breadcrumb">
            <Link to="/hr/applications">Applications</Link> &gt; <span>{application.candidate?.name}</span>
          </div>
          <div className="page-title-row">
            <h1 className="page-title">{application.candidate?.name}</h1>
            <StatusBadge status={application.status} type="application" />
          </div>
          <p className="page-subtitle">
            Applying for <strong>{application.position?.title}</strong> ({application.position?.department})
          </p>
          {/* Application Tags in Header (S2-15) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginTop: '10px' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Tag size={13} /> Tags:
            </span>
            {tags.length === 0 ? (
              <span style={{ fontSize: '0.75rem', color: 'var(--text-subtle)', fontStyle: 'italic' }}>No application tags</span>
            ) : (
              tags.map((tag) => (
                <span
                  key={tag.id}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '2px 8px',
                    borderRadius: '12px',
                    background: tag.color + '22',
                    border: `1px solid ${tag.color}55`,
                    color: tag.color,
                    fontSize: '0.75rem',
                    fontWeight: 600,
                  }}
                >
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: tag.color }} />
                  {tag.name}
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(tag.id)}
                    style={{ background: 'none', border: 'none', color: tag.color, cursor: 'pointer', padding: '0 0 0 2px', fontSize: '0.8rem', lineHeight: 1 }}
                    title="Remove tag"
                  >×</button>
                </span>
              ))
            )}
            <button
              type="button"
              onClick={() => setActiveTab('tags')}
              className="btn btn-sm btn-secondary"
              style={{ fontSize: '0.72rem', padding: '2px 8px', height: '22px', borderRadius: '10px' }}
            >
              + Manage Tags
            </button>
          </div>
        </div>

        <div className="page-actions">
          <button className="btn btn-secondary" onClick={() => setIsStatusModalOpen(true)}>
            🔄 Update Status
          </button>
          <button className="btn btn-outline-primary" onClick={() => setIsStageModalOpen(true)}>
            ⏩ Move Stage
          </button>
          <button className="btn btn-primary" onClick={() => setIsScheduleModalOpen(true)}>
            📅 Schedule Interview
          </button>
        </div>
      </div>

      {error && <div className="page-alert page-alert--error mb-4">{error}</div>}
      {successMessage && <div className="page-alert page-alert--success mb-4">{successMessage}</div>}

      {/* Tab Navigation */}
      <div className="tab-nav" style={{
        display: 'flex',
        gap: '4px',
        borderBottom: '1px solid var(--border-subtle, rgba(255,255,255,0.08))',
        marginBottom: '24px',
        overflowX: 'auto',
      }}>
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              padding: '10px 16px',
              fontSize: '0.85rem',
              fontWeight: activeTab === tab.key ? 700 : 500,
              color: activeTab === tab.key ? 'var(--primary)' : 'var(--text-muted)',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === tab.key ? '2px solid var(--primary)' : '2px solid transparent',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'all 0.15s',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── TAB: DETAILS & INTERVIEWS ─────────────────────────────────────────── */}
      {activeTab === 'details' && (
        <div className="detail-layout-grid">
          <div className="detail-main-column">
            {/* Candidate Profile Card */}
            <div className="content-card">
              <div className="content-card__header">
                <h3>Candidate Information</h3>
              </div>
              <div className="candidate-profile-grid">
                <div className="profile-item">
                  <span className="profile-item__label">Full Name</span>
                  <span className="profile-item__value">{application.candidate?.name}</span>
                </div>
                <div className="profile-item">
                  <span className="profile-item__label">Email Address</span>
                  <a href={`mailto:${application.candidate?.email}`} className="profile-item__value text-primary">
                    {application.candidate?.email}
                  </a>
                </div>
                <div className="profile-item">
                  <span className="profile-item__label">Phone Number</span>
                  <span className="profile-item__value">{application.candidate?.phone || 'Not provided'}</span>
                </div>
                <div className="profile-item">
                  <span className="profile-item__label">Application Source</span>
                  <span className="profile-item__value">{application.candidate?.source || 'Direct Website Application'}</span>
                </div>
                <div className="profile-item profile-item--full">
                  <span className="profile-item__label">CV / Resume</span>
                  {application.candidate?.resumeUrl ? (
                    <a href={application.candidate.resumeUrl} target="_blank" rel="noopener noreferrer" className="resume-link-btn" id="hr-view-cv-link">
                      📄 View CV / Resume ↗
                    </a>
                  ) : (
                    <span className="text-muted">No CV / Resume provided</span>
                  )}
                </div>
              </div>
            </div>

            {/* Pipeline Stage */}
            <div className="content-card">
              <div className="content-card__header">
                <h3>Current Pipeline Progress</h3>
                <button className="btn btn-sm btn-outline-primary" onClick={() => setIsStageModalOpen(true)}>Change Stage</button>
              </div>
              <div className="pipeline-progress-box">
                <div className="progress-stage-display">
                  <div className="progress-stage-display__number">{application.currentStage?.sequenceOrder || 1}</div>
                  <div className="progress-stage-display__info">
                    <h4>{application.currentStage?.name || 'Stage 1'}</h4>
                    <p>
                      {application.currentStage?.isGating ? (
                        <span className="text-warning">
                          🔒 Gated Stage — Requires {application.currentStage.feedbackRequiredCount} interview review(s) before advancing
                        </span>
                      ) : (
                        <span className="text-muted">Non-gating stage</span>
                      )}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Interviews */}
            <div className="content-card">
              <div className="content-card__header">
                <h3>Scheduled Interviews ({interviews.length})</h3>
                <button className="btn btn-sm btn-primary" onClick={() => setIsScheduleModalOpen(true)}>+ Schedule Interview</button>
              </div>
              {interviews.length === 0 ? (
                <div className="dashboard-empty-state">
                  <p>No interviews scheduled for this candidate yet.</p>
                  <button className="btn btn-sm btn-secondary mt-2" onClick={() => setIsScheduleModalOpen(true)}>Schedule First Interview</button>
                </div>
              ) : (
                <div className="application-interviews-list">
                  {interviews.map((int) => {
                    const interviewers = int.interviewers ?? int.assignments ?? [];
                    return (
                      <div key={int.id} className="app-interview-card">
                        <div className="app-interview-card__header">
                          <div>
                            <h4>{int.stage?.name || 'Interview Stage'}</h4>
                            <span className="app-interview-card__time">🕒 {new Date(int.scheduledAt).toLocaleString()}</span>
                          </div>
                          <StatusBadge status={int.status} type="interview" />
                        </div>
                        <div className="app-interview-card__details">
                          {int.location && <div>📍 <strong>Location:</strong> {int.location}</div>}
                          {int.meetingLink && (
                            <div>🔗 <strong>Meeting Link:</strong>{' '}
                              <a href={int.meetingLink} target="_blank" rel="noopener noreferrer" className="text-primary">{int.meetingLink}</a>
                            </div>
                          )}
                          {int.questionSet && (
                            <div style={{ marginTop: '4px' }}>📋 <strong>Evaluation Set:</strong>{' '}
                              <span style={{ fontSize: '0.78rem', padding: '2px 8px', borderRadius: '10px', background: 'rgba(99,102,241,0.12)', color: 'var(--primary)', fontWeight: 600 }}>
                                {int.questionSet.title} ({int.questionSet.questions?.length ?? 0} questions)
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="app-interview-card__interviewers">
                          <strong>Assigned Interviewers ({interviewers.length}):</strong>
                          <div className="interviewers-chip-list">
                            {interviewers.length === 0 ? (
                              <span className="text-muted" style={{ fontSize: '0.8rem' }}>No interviewers assigned</span>
                            ) : (
                              interviewers.map((ass) => (
                                <span key={ass.id} className="interviewer-chip">
                                  {ass.interviewer?.name || 'Interviewer'} ({ass.interviewer?.role || 'Staff'})
                                  {ass.feedbackSubmitted ? ' • ✓ Submitted' : ' • Pending'}
                                </span>
                              ))
                            )}
                          </div>
                        </div>
                        <div className="app-interview-card__footer">
                          <button type="button" className="btn btn-sm btn-secondary" onClick={() => setSelectedInterviewForFeedback(int)}>
                            💬 View Submitted Feedback
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="detail-sidebar-column">
            <div className="content-card">
              <div className="content-card__header">
                <h3>Assigned Team</h3>
                <button className="btn btn-sm btn-secondary" onClick={() => setIsTeamModalOpen(true)}>
                  {application.assignedTeam ? 'Reassign' : 'Assign'}
                </button>
              </div>
              {application.assignedTeam ? (
                <div className="team-assigned-box">
                  <span className="team-icon">🏢</span>
                  <div>
                    <h4>{application.assignedTeam.name}</h4>
                    <span className="form-help-text">Team Leads can review and interview this candidate.</span>
                  </div>
                </div>
              ) : (
                <div className="team-unassigned-box">
                  <p>No team currently assigned.</p>
                  <button className="btn btn-sm btn-outline-primary mt-2" onClick={() => setIsTeamModalOpen(true)}>Assign to Team</button>
                </div>
              )}
            </div>
            <div className="content-card">
              <div className="content-card__header">
                <h3>Application Status</h3>
                <button className="btn btn-sm btn-secondary" onClick={() => setIsStatusModalOpen(true)}>Update</button>
              </div>
              <div className="status-meta-box">
                <div className="status-row">
                  <span>Current Status:</span>
                  <StatusBadge status={application.status} type="application" />
                </div>
                {application.statusReason && (
                  <div className="status-reason-box">
                    <strong>Reason / Notes:</strong>
                    <p>{application.statusReason}</p>
                  </div>
                )}
                <ul className="info-meta-list mt-3">
                  <li><span>Applied On:</span><strong>{new Date(application.createdAt).toLocaleDateString()}</strong></li>
                  <li><span>Last Activity:</span><strong>{new Date(application.updatedAt).toLocaleDateString()}</strong></li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB: PRIVATE NOTES (S2-12) ────────────────────────────────────────── */}
      {isNotesAllowed && activeTab === 'notes' && (
        <div className="content-card">
          <div className="content-card__header">
            <h3>🔒 Private Internal Notes</h3>
            <span style={{ fontSize: '0.78rem', padding: '4px 8px', background: 'rgba(239,68,68,0.1)', borderRadius: '6px', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171' }}>
              HR &amp; Manager Only — Not visible to Team Leads or candidates
            </span>
          </div>
          <div style={{ marginBottom: '20px' }}>
            <textarea
              className="form-textarea"
              rows={3}
              placeholder="Add a private internal note (visible only to HR and Manager)..."
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              style={{ width: '100%', marginBottom: '8px', resize: 'vertical', minHeight: '80px' }}
            />
            <button className="btn btn-primary btn-sm" onClick={handleAddNote} disabled={isAddingNote || !newNote.trim()}>
              {isAddingNote ? 'Adding...' : '+ Add Note'}
            </button>
          </div>
          {notesLoading ? (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px' }}>Loading notes...</div>
          ) : notes.length === 0 ? (
            <div className="dashboard-empty-state"><p>No private notes yet.</p></div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {notes.map((note) => (
                <div key={note.id} style={{
                  padding: '14px 16px',
                  borderRadius: '8px',
                  background: 'rgba(99,102,241,0.06)',
                  border: '1px solid rgba(99,102,241,0.15)',
                  position: 'relative',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      <strong style={{ color: 'var(--text-main)' }}>{note.author?.name}</strong>
                      <span style={{ marginLeft: '6px' }}>({note.author?.role})</span>
                      <span style={{ marginLeft: '8px' }}>· {new Date(note.createdAt).toLocaleString()}</span>
                    </div>
                    {(note.authorId === user?.id || user?.role === 'Manager' || user?.role === 'HR') && (
                      <button
                        onClick={() => handleDeleteNote(note.id)}
                        style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', fontSize: '0.8rem', padding: '0 4px' }}
                        title="Delete note"
                      >✕</button>
                    )}
                  </div>
                  <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-main)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                    {note.content}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── TAB: TAGS (S2-15) ─────────────────────────────────────────────────── */}
      {activeTab === 'tags' && (
        <div className="content-card">
          <div className="content-card__header">
            <h3>🏷️ Application Tags</h3>
          </div>
          {/* Add tag form */}
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center', marginBottom: '20px' }}>
            <input
              type="text"
              className="form-input"
              placeholder="Tag name (e.g. Senior, Remote, Priority)..."
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              style={{ maxWidth: '240px' }}
            />
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Color:</span>
              {TAG_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setNewTagColor(c)}
                  style={{
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    background: c,
                    border: newTagColor === c ? '2px solid white' : '2px solid transparent',
                    cursor: 'pointer',
                    padding: 0,
                  }}
                />
              ))}
            </div>
            <button className="btn btn-primary btn-sm" onClick={handleAddTag} disabled={isAddingTag || !newTagName.trim()}>
              {isAddingTag ? 'Adding...' : '+ Add Tag'}
            </button>
          </div>

          {tagsLoading ? (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px' }}>Loading tags...</div>
          ) : tags.length === 0 ? (
            <div className="dashboard-empty-state"><p>No tags added yet. Use tags to categorize and filter candidates.</p></div>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
              {tags.map((tag) => (
                <div key={tag.id} style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 12px',
                  borderRadius: '20px',
                  background: tag.color + '22',
                  border: `1px solid ${tag.color}55`,
                  color: tag.color,
                  fontSize: '0.875rem',
                  fontWeight: 600,
                }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: tag.color, display: 'inline-block' }} />
                  {tag.name}
                  <button
                    onClick={() => handleRemoveTag(tag.id)}
                    style={{ background: 'none', border: 'none', color: tag.color, cursor: 'pointer', opacity: 0.7, fontSize: '0.85rem', padding: '0 0 0 4px', lineHeight: 1 }}
                    title="Remove tag"
                  >×</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── TAB: COMMENTS (S2-31/32) ─────────────────────────────────────────── */}
      {activeTab === 'comments' && (
        <div className="content-card">
          <div className="content-card__header">
            <h3>💬 Team Discussion & Comments</h3>
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
            Shared internal discussion thread. Type <strong>@</strong> to mention team members (they will be notified).
          </p>
          <div style={{ marginBottom: '20px', position: 'relative' }}>
            <textarea
              ref={commentTextareaRef}
              className="form-textarea"
              rows={3}
              placeholder="Add a comment... Type @ to mention team members"
              value={newComment}
              onChange={handleCommentTextChange}
              style={{ width: '100%', marginBottom: '8px', resize: 'vertical', minHeight: '80px' }}
            />
            {mentionQuery !== null && (
              <div style={{
                position: 'absolute',
                bottom: '48px',
                left: '0',
                background: 'var(--bg-card, #1e293b)',
                border: '1px solid var(--border-subtle, rgba(255,255,255,0.15))',
                borderRadius: '6px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
                zIndex: 100,
                width: '260px',
                maxHeight: '180px',
                overflowY: 'auto',
              }}>
                <div style={{ padding: '6px 10px', fontSize: '0.75rem', color: 'var(--text-muted)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  Matching team members:
                </div>
                {internalUsers
                  .filter((u) => u.name.toLowerCase().includes((mentionQuery || '').toLowerCase()))
                  .slice(0, 5)
                  .map((u) => (
                    <div
                      key={u.id}
                      onClick={() => handleSelectMention(u)}
                      style={{
                        padding: '8px 12px',
                        cursor: 'pointer',
                        fontSize: '0.85rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        borderBottom: '1px solid rgba(255,255,255,0.03)',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      <strong style={{ color: 'var(--text-main)' }}>{u.name}</strong>
                      {u.role && <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{u.role}</span>}
                    </div>
                  ))}
                {internalUsers.filter((u) => u.name.toLowerCase().includes((mentionQuery || '').toLowerCase())).length === 0 && (
                  <div style={{ padding: '8px 12px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>No matching users</div>
                )}
              </div>
            )}
            <button className="btn btn-primary btn-sm" onClick={handleAddComment} disabled={isAddingComment || !newComment.trim()}>
              {isAddingComment ? 'Posting...' : '💬 Post Comment'}
            </button>
          </div>
          {commentsLoading ? (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px' }}>Loading comments...</div>
          ) : comments.length === 0 ? (
            <div className="dashboard-empty-state"><p>No comments yet. Start the discussion!</p></div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {comments.map((comment) => (
                <div key={comment.id} style={{
                  padding: '14px 16px',
                  borderRadius: '8px',
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid var(--border-subtle, rgba(255,255,255,0.08))',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      <strong style={{ color: 'var(--text-main)' }}>{comment.author?.name}</strong>
                      <span style={{ marginLeft: '6px' }}>({comment.author?.role})</span>
                      <span style={{ marginLeft: '8px' }}>· {new Date(comment.createdAt).toLocaleString()}</span>
                      {comment.mentions && comment.mentions.length > 0 && (
                        <span style={{ marginLeft: '8px', color: 'var(--accent-cyan)', fontSize: '0.75rem' }}>
                          @ {comment.mentions.map((m) => m.user.name).join(', ')}
                        </span>
                      )}
                    </div>
                    {(comment.authorId === user?.id || user?.role === 'Manager') && (
                      <button
                        onClick={() => handleDeleteComment(comment.id)}
                        style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', fontSize: '0.8rem', padding: '0 4px' }}
                        title="Delete comment"
                      >✕</button>
                    )}
                  </div>
                  <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-main)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                    {renderMentions(comment.content)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── TAB: CONSOLIDATED SCORECARD (S2-17) ──────────────────────────────── */}
      {activeTab === 'scorecard' && (
        <div>
          {scorecardLoading ? (
            <div className="page-loading-state"><div className="spinner" /><p>Loading scorecard...</p></div>
          ) : scorecardError ? (
            <div className="page-alert page-alert--error">{scorecardError}</div>
          ) : !scorecard || scorecard.summary.totalFeedbacks === 0 ? (
            <div className="empty-state-card">
              <h3>No Feedback Submitted Yet</h3>
              <p>Once interviewers submit their evaluations, the consolidated scorecard will appear here.</p>
            </div>
          ) : (
            <>
              {/* Summary Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                <div className="content-card" style={{ padding: '18px', textAlign: 'center' }}>
                  <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--primary)' }}>{scorecard.summary.totalInterviews}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Total Interviews</div>
                </div>
                <div className="content-card" style={{ padding: '18px', textAlign: 'center' }}>
                  <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--accent-cyan)' }}>{scorecard.summary.totalFeedbacks}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Feedback Submissions</div>
                </div>
                <div className="content-card" style={{ padding: '18px', textAlign: 'center' }}>
                  <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--accent-emerald)' }}>
                    {scorecard.summary.overallWeightedScore !== null ? scorecard.summary.overallWeightedScore.toFixed(2) : '—'}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Overall Weighted Score /5</div>
                </div>
              </div>

              {/* Aggregated Criteria Table */}
              {scorecard.aggregatedCriteria.length > 0 && (
                <div className="content-card" style={{ marginBottom: '24px' }}>
                  <div className="content-card__header"><h3>Aggregated Criteria Scores</h3></div>
                  <div className="table-responsive">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Criterion</th>
                          <th>Avg Score</th>
                          <th>Avg Weight</th>
                          <th>Evaluations</th>
                        </tr>
                      </thead>
                      <tbody>
                        {scorecard.aggregatedCriteria.map((c) => (
                          <tr key={c.criterionName}>
                            <td><strong>{c.criterionName}</strong></td>
                            <td>
                              <span style={{
                                fontWeight: 700,
                                color: c.averageScore >= 4 ? 'var(--accent-emerald)' : c.averageScore >= 3 ? 'var(--accent-amber)' : '#f87171'
                              }}>
                                {c.averageScore.toFixed(2)} / 5
                              </span>
                            </td>
                            <td>{Number(c.averageWeight).toFixed(2)}</td>
                            <td>{c.count}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Per-Interview Feedback */}
              {scorecard.interviews.map((intItem) => (
                <div key={intItem.id} className="content-card" style={{ marginBottom: '16px' }}>
                  <div className="content-card__header">
                    <h3>Stage: {intItem.stageName}</h3>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      {intItem.scheduledAt ? new Date(intItem.scheduledAt).toLocaleDateString() : 'Date TBD'}
                    </span>
                  </div>
                  {intItem.feedbacks.length === 0 ? (
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No feedback submitted for this interview.</p>
                  ) : (
                    intItem.feedbacks.map((fb) => (
                      <div key={fb.id} style={{
                        padding: '14px 16px',
                        marginBottom: '10px',
                        borderRadius: '8px',
                        background: 'rgba(255,255,255,0.02)',
                        border: '1px solid var(--border-subtle, rgba(255,255,255,0.08))',
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                          <div>
                            <strong style={{ color: 'var(--text-main)', fontSize: '0.9rem' }}>{fb.interviewerName}</strong>
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem', marginLeft: '8px' }}>({fb.interviewerRole})</span>
                          </div>
                          {fb.overallRating !== null && (
                            <span style={{ fontWeight: 700, color: 'var(--accent-amber)', fontSize: '0.9rem' }}>
                              ⭐ {Number(fb.overallRating).toFixed(1)} / 5
                            </span>
                          )}
                        </div>
                        {fb.comments && (
                          <p style={{ fontSize: '0.85rem', color: 'var(--text-main)', marginBottom: '10px', lineHeight: 1.6 }}>{fb.comments}</p>
                        )}
                        {fb.criterionScores.length > 0 && (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                            {fb.criterionScores.map((cs) => (
                              <span key={cs.criterionName} style={{
                                fontSize: '0.78rem',
                                padding: '3px 10px',
                                borderRadius: '12px',
                                background: 'rgba(99,102,241,0.1)',
                                color: 'var(--primary)',
                                border: '1px solid rgba(99,102,241,0.2)',
                              }}>
                                {cs.criterionName}: <strong>{Number(cs.score).toFixed(1)}</strong> (w:{Number(cs.weight).toFixed(1)})
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              ))}
            </>
          )}
        </div>
      )}

      {/* ── TAB: OFFER APPROVAL REQUEST (S2-24) ──────────────────────────────── */}
      {activeTab === 'offer' && (
        <div className="content-card" style={{ maxWidth: '600px' }}>
          <div className="content-card__header">
            <h3>🤝 Request Manager Offer Approval</h3>
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '20px', lineHeight: 1.6 }}>
            Submit an offer for Manager sign-off. The Manager will approve or reject this offer before any offer is extended to the candidate.
          </p>
          <div className="form-group">
            <label className="form-label">Proposed Salary (optional)</label>
            <input
              type="number"
              className="form-input"
              placeholder="e.g. 75000"
              value={offerSalary}
              onChange={(e) => setOfferSalary(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Proposed Start Date (optional)</label>
            <input
              type="date"
              className="form-input"
              value={offerStartDate}
              onChange={(e) => setOfferStartDate(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Notes for Manager (optional)</label>
            <textarea
              className="form-textarea"
              rows={3}
              placeholder="Any additional context for the Manager..."
              value={offerNotes}
              onChange={(e) => setOfferNotes(e.target.value)}
              style={{ width: '100%', resize: 'vertical' }}
            />
          </div>
          <button
            className="btn btn-primary"
            onClick={handleRequestOffer}
            disabled={isRequestingOffer}
            style={{ marginTop: '8px' }}
          >
            {isRequestingOffer ? 'Submitting...' : '🤝 Submit for Manager Approval'}
          </button>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-subtle)', marginTop: '12px' }}>
            ⚠ Submitting this offer does NOT change the candidate's status. The Manager must explicitly approve before any offer is extended.
          </p>
        </div>
      )}

      {/* Modals */}
      <UpdateStatusModal
        isOpen={isStatusModalOpen}
        currentStatus={application.status}
        currentReason={application.statusReason}
        onClose={() => setIsStatusModalOpen(false)}
        onSubmit={handleUpdateStatus}
        isLoading={isSubmittingAction}
      />
      <MoveStageModal
        isOpen={isStageModalOpen}
        currentStageId={application.currentStageId}
        stages={stages}
        onClose={() => setIsStageModalOpen(false)}
        onSubmit={handleMoveStage}
        isLoading={isSubmittingAction}
      />
      <AssignTeamModal
        isOpen={isTeamModalOpen}
        currentTeamId={application.assignedTeamId}
        onClose={() => setIsTeamModalOpen(false)}
        onSubmit={handleAssignTeam}
        isLoading={isSubmittingAction}
      />
      <ScheduleInterviewModal
        isOpen={isScheduleModalOpen}
        applicationId={application.id}
        candidateName={application.candidate?.name || 'Candidate'}
        positionTitle={application.position?.title || 'Position'}
        stages={stages}
        defaultStageId={application.currentStageId}
        onClose={() => setIsScheduleModalOpen(false)}
        onSubmit={handleScheduleInterview}
        isLoading={isSubmittingAction}
      />
      <ViewFeedbackModal
        isOpen={!!selectedInterviewForFeedback}
        interview={selectedInterviewForFeedback}
        onClose={() => setSelectedInterviewForFeedback(null)}
      />
    </div>
  );
};

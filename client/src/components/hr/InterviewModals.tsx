import React, { useState, useEffect } from 'react';
import {
  Stage,
  EligibleInterviewerItem,
  Interview,
  InterviewStatus,
  ScheduleInterviewInput,
  UpdateInterviewInput,
  FeedbackItem,
  QuestionSet,
} from '../../types/hr';
import { hrLookupsApi } from '../../api/hrLookups.api';
import { hrFeedbackApi } from '../../api/hrFeedback.api';
import { getQuestionSets, getQuestionSetById } from '../../api/batch2.api';
import { StatusBadge } from './StatusBadge';

/* =========================================================================
   1. SCHEDULE INTERVIEW MODAL
   ========================================================================= */
interface ScheduleInterviewModalProps {
  isOpen: boolean;
  applicationId: string;
  candidateName: string;
  positionTitle: string;
  stages: Stage[];
  defaultStageId?: string;
  onClose: () => void;
  onSubmit: (data: ScheduleInterviewInput) => Promise<void>;
  isLoading?: boolean;
}

export const ScheduleInterviewModal: React.FC<ScheduleInterviewModalProps> = ({
  isOpen,
  candidateName,
  positionTitle,
  stages,
  defaultStageId,
  onClose,
  onSubmit,
  isLoading = false
}) => {
  const [stageId, setStageId] = useState<string>('');
  const [scheduledAt, setScheduledAt] = useState<string>('');
  const [location, setLocation] = useState<string>('');
  const [meetingLink, setMeetingLink] = useState<string>('');
  const [selectedInterviewerIds, setSelectedInterviewerIds] = useState<string[]>([]);
  const [eligibleInterviewers, setEligibleInterviewers] = useState<EligibleInterviewerItem[]>([]);
  const [isFetchingInterviewers, setIsFetchingInterviewers] = useState(false);
  const [questionSets, setQuestionSets] = useState<QuestionSet[]>([]);
  const [selectedQuestionSetId, setSelectedQuestionSetId] = useState<string>('');
  const [previewQuestionSet, setPreviewQuestionSet] = useState<QuestionSet | null>(null);
  const [showQuestionPreview, setShowQuestionPreview] = useState<boolean>(false);
  const [isPreviewLoading, setIsPreviewLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      setStageId(defaultStageId || (stages[0]?.id ?? ''));
      setLocation('');
      setMeetingLink('');
      setSelectedInterviewerIds([]);
      setSelectedQuestionSetId('');
      setShowQuestionPreview(false);
      setPreviewQuestionSet(null);

      // Default scheduledAt to tomorrow at 10:00 AM
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(10, 0, 0, 0);
      const iso = tomorrow.toISOString();
      setScheduledAt(iso.slice(0, 16));

      setIsFetchingInterviewers(true);
      hrLookupsApi.listEligibleInterviewers()
        .then((res) => {
          setEligibleInterviewers(res.data);
        })
        .catch((err: any) => {
          setError(err?.message || 'Failed to load eligible interviewers.');
        })
        .finally(() => {
          setIsFetchingInterviewers(false);
        });

      getQuestionSets()
        .then((sets) => setQuestionSets(sets || []))
        .catch(() => {});
    }
  }, [isOpen, defaultStageId, stages]);

  if (!isOpen) return null;

  const toggleInterviewer = (id: string) => {
    setSelectedInterviewerIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleQuestionSetChange = (qsId: string) => {
    setSelectedQuestionSetId(qsId);
    setShowQuestionPreview(false);
    setPreviewQuestionSet(null);
  };

  const handleTogglePreview = async () => {
    if (showQuestionPreview) {
      setShowQuestionPreview(false);
      return;
    }
    if (!selectedQuestionSetId) return;
    setIsPreviewLoading(true);
    try {
      const detailed = await getQuestionSetById(selectedQuestionSetId);
      setPreviewQuestionSet(detailed);
      setShowQuestionPreview(true);
    } catch {
      // ignore
    } finally {
      setIsPreviewLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!stageId) {
      setError('Please select an interview stage.');
      return;
    }

    if (!scheduledAt) {
      setError('Please select an interview date and time.');
      return;
    }

    const scheduledDate = new Date(scheduledAt);
    if (scheduledDate.getTime() <= Date.now()) {
      setError('Interview scheduled date/time must be in the future.');
      return;
    }

    if (selectedInterviewerIds.length === 0) {
      setError('Please select at least one interviewer.');
      return;
    }

    if (meetingLink.trim() && !/^https?:\/\/.+/i.test(meetingLink.trim())) {
      setError('Meeting link must be a valid URL starting with http:// or https://');
      return;
    }

    try {
      await onSubmit({
        stageId,
        scheduledAt: scheduledDate.toISOString(),
        location: location.trim() ? location.trim() : undefined,
        meetingLink: meetingLink.trim() ? meetingLink.trim() : undefined,
        interviewerIds: selectedInterviewerIds,
        questionSetId: selectedQuestionSetId || undefined
      });
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to schedule interview.');
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content modal-content--wide" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Schedule Interview: {candidateName}</h3>
          <button className="modal-close-btn" onClick={onClose}>&times;</button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          {error && <div className="modal-alert modal-alert--error">{error}</div>}

          <div className="form-info-box">
            <div><strong>Position:</strong> {positionTitle}</div>
          </div>

          <div className="form-row">
            <div className="form-group form-group--half">
              <label htmlFor="sched-stage">Interview Stage *</label>
              <select
                id="sched-stage"
                className="form-select"
                value={stageId}
                onChange={(e) => setStageId(e.target.value)}
                required
              >
                {(stages || []).map((s) => (
                  <option key={s.id} value={s.id}>
                    Stage {s.sequenceOrder}: {s.name} {s.isGating ? '🔒' : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group form-group--half">
              <label htmlFor="sched-datetime">Date & Time *</label>
              <input
                id="sched-datetime"
                type="datetime-local"
                className="form-input"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group form-group--half">
              <label htmlFor="sched-location">Location / Room (Optional)</label>
              <input
                id="sched-location"
                type="text"
                className="form-input"
                placeholder="e.g. Conference Room A, HQ Floor 3"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </div>

            <div className="form-group form-group--half">
              <label htmlFor="sched-link">Meeting Link (Optional)</label>
              <input
                id="sched-link"
                type="url"
                className="form-input"
                placeholder="https://meet.google.com/xyz-abcd-efg"
                value={meetingLink}
                onChange={(e) => setMeetingLink(e.target.value)}
              />
            </div>
          </div>

          {/* S2-20/21: Question Set Selection & Preview */}
          <div className="form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <label htmlFor="sched-questionset" style={{ margin: 0 }}>
                Evaluation Question Set (Optional)
              </label>
              {selectedQuestionSetId && (
                <button
                  type="button"
                  onClick={handleTogglePreview}
                  className="btn btn-sm btn-secondary"
                  style={{ fontSize: '0.75rem', padding: '2px 8px', height: '24px' }}
                >
                  {isPreviewLoading ? 'Loading...' : showQuestionPreview ? 'Hide Preview' : '👁️ Preview Questions'}
                </button>
              )}
            </div>
            <select
              id="sched-questionset"
              className="form-select"
              value={selectedQuestionSetId}
              onChange={(e) => handleQuestionSetChange(e.target.value)}
            >
              <option value="">None / General Evaluation Criteria</option>
              {questionSets.map((qs) => (
                <option key={qs.id} value={qs.id}>
                  {qs.title} ({qs.category || 'General'}) — {qs.questionCount ?? qs.questions?.length ?? 0} questions
                </option>
              ))}
            </select>
            {showQuestionPreview && previewQuestionSet && (
              <div style={{
                marginTop: '10px',
                padding: '12px 14px',
                borderRadius: '8px',
                background: 'rgba(99,102,241,0.06)',
                border: '1px solid rgba(99,102,241,0.2)',
                maxHeight: '200px',
                overflowY: 'auto',
              }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--primary)', marginBottom: '8px' }}>
                  {previewQuestionSet.title} ({previewQuestionSet.questions?.length || 0} Questions):
                </div>
                {(!previewQuestionSet.questions || previewQuestionSet.questions.length === 0) ? (
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>No questions in this set.</div>
                ) : (
                  previewQuestionSet.questions.map((q, idx) => (
                    <div key={q.id || idx} style={{ marginBottom: '8px', fontSize: '0.82rem', lineHeight: 1.4 }}>
                      <strong>{idx + 1}. {q.questionText}</strong>
                      {q.guidance && (
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.76rem', marginTop: '2px', paddingLeft: '12px' }}>
                          💡 <em>Guidance: {q.guidance}</em>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
            <p className="form-help-text">
              Assign a structured question set to provide targeted evaluation guidance to interviewers.
            </p>
          </div>

          <div className="form-group">
            <label>Select Interviewers * ({selectedInterviewerIds.length} selected)</label>
            {isFetchingInterviewers ? (
              <div className="modal-loading-text">Loading eligible interviewers...</div>
            ) : eligibleInterviewers.length === 0 ? (
              <div className="modal-alert modal-alert--warning">No active HR or TeamLead interviewers found.</div>
            ) : (
              <div className="interviewer-checklist">
                {eligibleInterviewers.map((user) => (
                  <label key={user.id} className="interviewer-checklist__item">
                    <input
                      type="checkbox"
                      checked={selectedInterviewerIds.includes(user.id)}
                      onChange={() => toggleInterviewer(user.id)}
                    />
                    <div className="interviewer-checklist__info">
                      <span className="interviewer-checklist__name">{user.name}</span>
                      <span className="interviewer-checklist__meta">
                        {user.email} • <span className={`role-tag role-tag--${user.role.toLowerCase()}`}>{user.role}</span>
                      </span>
                    </div>
                  </label>
                ))}
              </div>
            )}
            <p className="form-help-text">
              Only active HR and Team Lead users are eligible to conduct interviews.
            </p>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={isLoading}>
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isLoading || isFetchingInterviewers || selectedInterviewerIds.length === 0}
            >
              {isLoading ? 'Scheduling...' : 'Schedule Interview'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

/* =========================================================================
   2. EDIT INTERVIEW MODAL (Reschedule, Location, Meeting Link)
   ========================================================================= */
interface EditInterviewModalProps {
  isOpen: boolean;
  interview: Interview | null;
  onClose: () => void;
  onSubmit: (interviewId: string, data: UpdateInterviewInput) => Promise<void>;
  isLoading?: boolean;
}

export const EditInterviewModal: React.FC<EditInterviewModalProps> = ({
  isOpen,
  interview,
  onClose,
  onSubmit,
  isLoading = false
}) => {
  const [scheduledAt, setScheduledAt] = useState<string>('');
  const [location, setLocation] = useState<string>('');
  const [meetingLink, setMeetingLink] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (interview) {
      const date = new Date(interview.scheduledAt);
      const iso = date.toISOString();
      setScheduledAt(iso.slice(0, 16));
      setLocation(interview.location || '');
      setMeetingLink(interview.meetingLink || '');
      setError(null);
    }
  }, [interview, isOpen]);

  if (!isOpen || !interview) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const payload: UpdateInterviewInput = {};

    if (scheduledAt) {
      const parsed = new Date(scheduledAt);
      if (parsed.getTime() <= Date.now()) {
        setError('Rescheduled time must be in the future.');
        return;
      }
      payload.scheduledAt = parsed.toISOString();
    }

    if (meetingLink.trim()) {
      if (!/^https?:\/\/.+/i.test(meetingLink.trim())) {
        setError('Meeting link must be a valid URL starting with http:// or https://');
        return;
      }
      payload.meetingLink = meetingLink.trim();
    } else if (meetingLink === '') {
      payload.meetingLink = undefined;
    }

    payload.location = location.trim() ? location.trim() : undefined;

    try {
      await onSubmit(interview.id, payload);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to update interview details.');
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Edit Interview Details</h3>
          <button className="modal-close-btn" onClick={onClose}>&times;</button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          {error && <div className="modal-alert modal-alert--error">{error}</div>}

          <div className="form-group">
            <label htmlFor="edit-sched-datetime">Scheduled Date & Time</label>
            <input
              id="edit-sched-datetime"
              type="datetime-local"
              className="form-input"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="edit-location">Location / Room</label>
            <input
              id="edit-location"
              type="text"
              className="form-input"
              placeholder="e.g. Conference Room B"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label htmlFor="edit-link">Meeting Link</label>
            <input
              id="edit-link"
              type="url"
              className="form-input"
              placeholder="https://meet.google.com/xyz"
              value={meetingLink}
              onChange={(e) => setMeetingLink(e.target.value)}
            />
          </div>

          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={isLoading}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={isLoading}>
              {isLoading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

/* =========================================================================
   3. UPDATE INTERVIEW STATUS MODAL
   ========================================================================= */
interface UpdateInterviewStatusModalProps {
  isOpen: boolean;
  interview: Interview | null;
  onClose: () => void;
  onSubmit: (interviewId: string, status: InterviewStatus) => Promise<void>;
  isLoading?: boolean;
}

export const UpdateInterviewStatusModal: React.FC<UpdateInterviewStatusModalProps> = ({
  isOpen,
  interview,
  onClose,
  onSubmit,
  isLoading = false
}) => {
  const [status, setStatus] = useState<InterviewStatus>(interview?.status || 'Scheduled');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (interview) {
      setStatus(interview.status);
      setError(null);
    }
  }, [interview, isOpen]);

  if (!isOpen || !interview) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      await onSubmit(interview.id, status);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to update interview status.');
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Update Interview Status</h3>
          <button className="modal-close-btn" onClick={onClose}>&times;</button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          {error && <div className="modal-alert modal-alert--error">{error}</div>}

          <div className="form-group">
            <label htmlFor="int-status-select">Select Status *</label>
            <select
              id="int-status-select"
              className="form-select"
              value={status}
              onChange={(e) => setStatus(e.target.value as InterviewStatus)}
              required
            >
              <option value="Scheduled">Scheduled</option>
              <option value="Completed">Completed</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={isLoading}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={isLoading}>
              {isLoading ? 'Updating...' : 'Update Status'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

/* =========================================================================
   4. REPLACE INTERVIEWERS MODAL (WITH 409 SUBMITTED FEEDBACK HANDLING)
   ========================================================================= */
interface ReplaceInterviewersModalProps {
  isOpen: boolean;
  interview: Interview | null;
  onClose: () => void;
  onSubmit: (interviewId: string, interviewerIds: string[]) => Promise<void>;
  isLoading?: boolean;
}

export const ReplaceInterviewersModal: React.FC<ReplaceInterviewersModalProps> = ({
  isOpen,
  interview,
  onClose,
  onSubmit,
  isLoading = false
}) => {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [eligibleInterviewers, setEligibleInterviewers] = useState<EligibleInterviewerItem[]>([]);
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isConflict, setIsConflict] = useState(false);

  useEffect(() => {
    if (isOpen && interview) {
      setError(null);
      setIsConflict(false);
      const currentInterviewers = interview.interviewers ?? interview.assignments ?? [];
      setSelectedIds(currentInterviewers.map((i) => i.interviewerId));

      setIsFetching(true);
      hrLookupsApi.listEligibleInterviewers()
        .then((res) => {
          setEligibleInterviewers(res.data || []);
        })
        .catch((err: any) => {
          setError(err?.message || 'Failed to load eligible interviewers.');
        })
        .finally(() => {
          setIsFetching(false);
        });
    }
  }, [isOpen, interview]);

  if (!isOpen || !interview) return null;

  const currentInterviewers = interview.interviewers ?? interview.assignments ?? [];

  const toggleInterviewer = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
    setError(null);
    setIsConflict(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsConflict(false);

    if (selectedIds.length === 0) {
      setError('Interview must have at least one interviewer assigned.');
      return;
    }

    try {
      await onSubmit(interview.id, selectedIds);
      onClose();
    } catch (err: any) {
      if (err?.error === 'ConflictError' || err?.message?.toLowerCase().includes('feedback')) {
        setIsConflict(true);
      }
      setError(err?.message || 'Failed to update interviewers.');
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Manage Interviewers</h3>
          <button className="modal-close-btn" onClick={onClose}>&times;</button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          {error && (
            <div className={`modal-alert ${isConflict ? 'modal-alert--warning' : 'modal-alert--error'}`}>
              <strong>{isConflict ? 'Interviewer Assignment Protected:' : 'Error:'}</strong> {error}
            </div>
          )}

          {isFetching ? (
            <div className="modal-loading-text">Loading interviewers...</div>
          ) : (
            <div className="form-group">
              <label>Select Assigned Interviewers * ({selectedIds.length} selected)</label>
              <div className="interviewer-checklist">
                {eligibleInterviewers.map((user) => {
                  const existingAssignment = currentInterviewers.find((i) => i.interviewerId === user.id);
                  const hasSubmitted = existingAssignment?.feedbackSubmitted;

                  return (
                    <label
                      key={user.id}
                      className={`interviewer-checklist__item ${hasSubmitted ? 'interviewer-checklist__item--submitted' : ''}`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(user.id)}
                        onChange={() => toggleInterviewer(user.id)}
                      />
                      <div className="interviewer-checklist__info">
                        <span className="interviewer-checklist__name">
                          {user.name} {hasSubmitted && <span className="submitted-tag">✓ Submitted Feedback</span>}
                        </span>
                        <span className="interviewer-checklist__meta">
                          {user.email} • {user.role}
                        </span>
                      </div>
                    </label>
                  );
                })}
              </div>
              <p className="form-help-text">
                Note: Interviewers who have already submitted feedback cannot be removed.
              </p>
            </div>
          )}

          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={isLoading}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={isLoading || selectedIds.length === 0}>
              {isLoading ? 'Saving...' : 'Save Interviewers'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

/* =========================================================================
   5. VIEW FEEDBACK MODAL (READ-ONLY FOR HR)
   ========================================================================= */
interface ViewFeedbackModalProps {
  isOpen: boolean;
  interview: Interview | null;
  onClose: () => void;
}

export const ViewFeedbackModal: React.FC<ViewFeedbackModalProps> = ({
  isOpen,
  interview,
  onClose
}) => {
  const [feedbacks, setFeedbacks] = useState<FeedbackItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && interview) {
      setError(null);
      setIsLoading(true);
      hrFeedbackApi.getInterviewFeedback(interview.id)
        .then((res) => {
          setFeedbacks(res.data);
        })
        .catch((err: any) => {
          setError(err?.message || 'Failed to load feedback records.');
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [isOpen, interview]);

  if (!isOpen || !interview) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content modal-content--wide" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h3>Interview Feedback</h3>
            <p className="modal-subtitle">
              Candidate: <strong>{interview.application?.candidate?.name}</strong> • Stage: <strong>{interview.stage?.name}</strong>
            </p>
          </div>
          <button className="modal-close-btn" onClick={onClose}>&times;</button>
        </div>

        <div className="modal-body">
          {error && <div className="modal-alert modal-alert--error">{error}</div>}

          {isLoading ? (
            <div className="modal-loading-text">Loading feedback submissions...</div>
          ) : feedbacks.length === 0 ? (
            <div className="empty-state-box">
              <p>No feedback has been submitted for this interview yet.</p>
              <span className="form-help-text">Assigned interviewers will submit ratings and feedback from their portal.</span>
            </div>
          ) : (
            <div className="feedback-list">
              {feedbacks.map((fb) => (
                <div key={fb.id} className="feedback-card">
                  <div className="feedback-card__header">
                    <div className="feedback-card__interviewer">
                      <span className="feedback-card__author">{fb.interviewer?.name}</span>
                      <span className="feedback-card__role">({fb.interviewer?.role})</span>
                    </div>
                    <div className="feedback-card__rating">
                      Overall Rating: <span className="rating-badge">{Number(fb.overallRating).toFixed(1)}</span>
                    </div>
                  </div>

                  <div className="feedback-card__comments">
                    <strong>Comments:</strong>
                    <p>{fb.comments}</p>
                  </div>

                  {fb.criteriaScores && fb.criteriaScores.length > 0 && (
                    <div className="feedback-card__criteria">
                      <strong>Criterion Breakdown:</strong>
                      <table className="criteria-table">
                        <thead>
                          <tr>
                            <th>Criterion</th>
                            <th>Weight</th>
                            <th>Score</th>
                          </tr>
                        </thead>
                        <tbody>
                          {fb.criteriaScores.map((crit, idx) => (
                            <tr key={crit.id || idx}>
                              <td>{crit.criterionName}</td>
                              <td>{Number(crit.weight).toFixed(2)}</td>
                              <td>{Number(crit.score).toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  <div className="feedback-card__footer">
                    Submitted on: {new Date(fb.submittedAt).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="modal-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

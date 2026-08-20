import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { hrInterviewsApi } from '../../api/hrInterviews.api';
import {
  Interview,
  InterviewStatus,
  UpdateInterviewInput
} from '../../types/hr';
import { StatusBadge } from '../../components/hr/StatusBadge';
import {
  EditInterviewModal,
  UpdateInterviewStatusModal,
  ReplaceInterviewersModal,
  ViewFeedbackModal
} from '../../components/hr/InterviewModals';

export const HRInterviewsPage: React.FC = () => {
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<InterviewStatus | ''>('');
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');

  // Modals state
  const [editingInterview, setEditingInterview] = useState<Interview | null>(null);
  const [statusUpdatingInterview, setStatusUpdatingInterview] = useState<Interview | null>(null);
  const [replacingInterview, setReplacingInterview] = useState<Interview | null>(null);
  const [viewingFeedbackInterview, setViewingFeedbackInterview] = useState<Interview | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchInterviews = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await hrInterviewsApi.listInterviews({
        status: statusFilter || undefined,
        from: fromDate ? new Date(fromDate).toISOString() : undefined,
        to: toDate ? new Date(toDate).toISOString() : undefined
      });
      // Sort by scheduledAt asc
      const sorted = (res.data || []).sort(
        (a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()
      );
      setInterviews(sorted);
    } catch (err: any) {
      setError(err?.message || 'Failed to load interviews.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInterviews();
  }, [statusFilter, fromDate, toDate]);

  const handleEditInterview = async (interviewId: string, data: UpdateInterviewInput) => {
    setIsSubmitting(true);
    setError(null);
    setSuccessMessage(null);
    try {
      await hrInterviewsApi.updateInterview(interviewId, data);
      setSuccessMessage('Interview details updated successfully.');
      await fetchInterviews();
    } catch (err: any) {
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateStatus = async (interviewId: string, status: InterviewStatus) => {
    setIsSubmitting(true);
    setError(null);
    setSuccessMessage(null);
    try {
      await hrInterviewsApi.updateStatus(interviewId, status);
      setSuccessMessage(`Interview status marked as ${status}.`);
      await fetchInterviews();
    } catch (err: any) {
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReplaceInterviewers = async (interviewId: string, interviewerIds: string[]) => {
    setIsSubmitting(true);
    setError(null);
    setSuccessMessage(null);
    try {
      await hrInterviewsApi.replaceInterviewers(interviewId, { interviewerIds });
      setSuccessMessage('Interview assignments updated successfully.');
      await fetchInterviews();
    } catch (err: any) {
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="page-container hr-interviews-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Interview Schedules</h1>
          <p className="page-subtitle">Coordinate interviewer assignments, reschedules, and monitor candidate feedback.</p>
        </div>
      </div>

      {error && <div className="page-alert page-alert--error mb-4">{error}</div>}
      {successMessage && <div className="page-alert page-alert--success mb-4">{successMessage}</div>}

      {/* Filter Toolbar */}
      <div className="filter-toolbar">
        <div className="filter-group">
          <label className="filter-label">Status</label>
          <select
            className="form-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as InterviewStatus | '')}
          >
            <option value="">All Statuses</option>
            <option value="Scheduled">Scheduled</option>
            <option value="Completed">Completed</option>
            <option value="Cancelled">Cancelled</option>
          </select>
        </div>

        <div className="filter-group">
          <label className="filter-label">From Date</label>
          <input
            type="date"
            className="form-input"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
          />
        </div>

        <div className="filter-group">
          <label className="filter-label">To Date</label>
          <input
            type="date"
            className="form-input"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
          />
        </div>

        {(statusFilter || fromDate || toDate) && (
          <button
            className="btn btn-secondary btn-sm self-end"
            onClick={() => {
              setStatusFilter('');
              setFromDate('');
              setToDate('');
            }}
          >
            Reset Filters
          </button>
        )}
      </div>

      {/* Interviews Content */}
      {isLoading ? (
        <div className="page-loading-state">
          <div className="spinner"></div>
          <p>Loading interview schedules...</p>
        </div>
      ) : interviews.length === 0 ? (
        <div className="empty-state-card">
          <h3>No interviews found</h3>
          <p>No interviews match the selected filters. Interviews are scheduled from candidate application pages.</p>
          <Link to="/hr/applications" className="btn btn-primary btn-sm mt-3">
            Go to Applications
          </Link>
        </div>
      ) : (
        <div className="interviews-grid">
          {interviews.map((int) => {
            const hasSubmittedFeedback = int.interviewers.some((i) => i.feedbackSubmitted);

            return (
              <div key={int.id} className="interview-schedule-card">
                <div className="interview-schedule-card__header">
                  <div>
                    <span className="stage-pill">{int.stage?.name}</span>
                    <h3 className="interview-schedule-card__candidate">
                      <Link to={`/hr/applications/${int.applicationId}`}>
                        {int.application?.candidate?.name}
                      </Link>
                    </h3>
                    <span className="interview-schedule-card__position">
                      {int.application?.position?.title} ({int.application?.position?.department})
                    </span>
                  </div>
                  <StatusBadge status={int.status} type="interview" />
                </div>

                <div className="interview-schedule-card__time-info">
                  <span className="time-badge">
                    🗓️ {new Date(int.scheduledAt).toLocaleDateString()} at{' '}
                    {new Date(int.scheduledAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  {int.location && <span className="loc-badge">📍 {int.location}</span>}
                </div>

                {int.meetingLink && (
                  <div className="interview-schedule-card__link">
                    <span>🔗 Meeting: </span>
                    <a href={int.meetingLink} target="_blank" rel="noopener noreferrer" className="text-primary">
                      {int.meetingLink}
                    </a>
                  </div>
                )}

                <div className="interview-schedule-card__interviewers">
                  <strong>Assigned Interviewers ({int.interviewers.length}):</strong>
                  <div className="interviewers-chip-list mt-1">
                    {int.interviewers.map((ass) => (
                      <span
                        key={ass.id}
                        className={`interviewer-chip ${ass.feedbackSubmitted ? 'interviewer-chip--submitted' : ''}`}
                      >
                        {ass.interviewer.name} ({ass.interviewer.role})
                        {ass.feedbackSubmitted ? ' • ✓ Submitted' : ' • Pending'}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="interview-schedule-card__actions">
                  <div className="btn-group">
                    <button
                      type="button"
                      className="btn btn-sm btn-secondary"
                      onClick={() => setEditingInterview(int)}
                      disabled={int.status === 'Cancelled'}
                    >
                      ✏️ Reschedule / Edit
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm btn-secondary"
                      onClick={() => setReplacingInterview(int)}
                    >
                      👥 Interviewers
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm btn-secondary"
                      onClick={() => setStatusUpdatingInterview(int)}
                    >
                      Status
                    </button>
                  </div>

                  <button
                    type="button"
                    className={`btn btn-sm ${hasSubmittedFeedback ? 'btn-primary' : 'btn-outline-primary'}`}
                    onClick={() => setViewingFeedbackInterview(int)}
                  >
                    💬 View Feedback {hasSubmittedFeedback && '★'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modals */}
      <EditInterviewModal
        isOpen={!!editingInterview}
        interview={editingInterview}
        onClose={() => setEditingInterview(null)}
        onSubmit={handleEditInterview}
        isLoading={isSubmitting}
      />

      <UpdateInterviewStatusModal
        isOpen={!!statusUpdatingInterview}
        interview={statusUpdatingInterview}
        onClose={() => setStatusUpdatingInterview(null)}
        onSubmit={handleUpdateStatus}
        isLoading={isSubmitting}
      />

      <ReplaceInterviewersModal
        isOpen={!!replacingInterview}
        interview={replacingInterview}
        onClose={() => setReplacingInterview(null)}
        onSubmit={handleReplaceInterviewers}
        isLoading={isSubmitting}
      />

      <ViewFeedbackModal
        isOpen={!!viewingFeedbackInterview}
        interview={viewingFeedbackInterview}
        onClose={() => setViewingFeedbackInterview(null)}
      />
    </div>
  );
};

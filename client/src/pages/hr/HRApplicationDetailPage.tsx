import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { hrApplicationsApi } from '../../api/hrApplications.api';
import { hrPositionsApi } from '../../api/hrPositions.api';
import { hrInterviewsApi } from '../../api/hrInterviews.api';
import {
  Application,
  Stage,
  Interview,
  ApplicationStatus,
  ScheduleInterviewInput
} from '../../types/hr';
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

export const HRApplicationDetailPage: React.FC = () => {
  const { applicationId } = useParams<{ applicationId: string }>();

  const [application, setApplication] = useState<Application | null>(null);
  const [stages, setStages] = useState<Stage[]>([]);
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Modals
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [isStageModalOpen, setIsStageModalOpen] = useState(false);
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [selectedInterviewForFeedback, setSelectedInterviewForFeedback] = useState<Interview | null>(null);

  const [isSubmittingAction, setIsSubmittingAction] = useState(false);

  const fetchApplicationDetails = async () => {
    if (!applicationId) return;
    setIsLoading(true);
    setError(null);
    try {
      const [appRes, intRes] = await Promise.all([
        hrApplicationsApi.getApplication(applicationId),
        hrInterviewsApi.listInterviews({ applicationId })
      ]);
      setApplication(appRes.data);
      setInterviews(intRes.data || []);

      // Fetch position stages for stage movement & interview scheduling
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

  // Status update
  const handleUpdateStatus = async (newStatus: ApplicationStatus, statusReason?: string) => {
    if (!applicationId) return;
    setIsSubmittingAction(true);
    setError(null);
    try {
      const res = await hrApplicationsApi.updateStatus(applicationId, { status: newStatus, statusReason });
      setApplication((prev) => prev ? { ...prev, ...res.data } : res.data);
      setSuccessMessage(`Application status updated to ${newStatus}.`);
    } catch (err: any) {
      throw err;
    } finally {
      setIsSubmittingAction(false);
    }
  };

  // Stage Move
  const handleMoveStage = async (stageId: string) => {
    if (!applicationId) return;
    setIsSubmittingAction(true);
    setError(null);
    try {
      const res = await hrApplicationsApi.moveStage(applicationId, { stageId });
      setApplication((prev) => prev ? { ...prev, ...res.data } : res.data);
      setSuccessMessage('Candidate advanced to new pipeline stage successfully.');
    } catch (err: any) {
      throw err;
    } finally {
      setIsSubmittingAction(false);
    }
  };

  // Team Assignment
  const handleAssignTeam = async (teamId: string) => {
    if (!applicationId) return;
    setIsSubmittingAction(true);
    setError(null);
    try {
      const res = await hrApplicationsApi.assignTeam(applicationId, { teamId });
      setApplication((prev) => prev ? { ...prev, ...res.data } : res.data);
      setSuccessMessage('Team assigned to application successfully.');
    } catch (err: any) {
      throw err;
    } finally {
      setIsSubmittingAction(false);
    }
  };

  // Schedule Interview
  const handleScheduleInterview = async (data: ScheduleInterviewInput) => {
    if (!applicationId) return;
    setIsSubmittingAction(true);
    setError(null);
    try {
      await hrApplicationsApi.scheduleInterview(applicationId, data);
      setSuccessMessage('Interview scheduled successfully.');
      // Refresh interviews list
      const intRes = await hrInterviewsApi.listInterviews({ applicationId });
      setInterviews(intRes.data || []);
    } catch (err: any) {
      throw err;
    } finally {
      setIsSubmittingAction(false);
    }
  };

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

      <div className="detail-layout-grid">
        {/* Main Left Column */}
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
                <span className="profile-item__value">
                  {application.candidate?.phone || 'Not provided'}
                </span>
              </div>
              <div className="profile-item">
                <span className="profile-item__label">Application Source</span>
                <span className="profile-item__value">
                  {application.candidate?.source || 'Direct Website Application'}
                </span>
              </div>
              <div className="profile-item profile-item--full">
                <span className="profile-item__label">Resume / CV</span>
                {application.candidate?.resumeUrl ? (
                  <a
                    href={application.candidate.resumeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="resume-link-btn"
                  >
                    📄 View Candidate Resume (External Link) ↗
                  </a>
                ) : (
                  <span className="text-muted">No resume link provided</span>
                )}
              </div>
            </div>
          </div>

          {/* Position & Pipeline Stage Details */}
          <div className="content-card">
            <div className="content-card__header">
              <h3>Current Pipeline Progress</h3>
              <button className="btn btn-sm btn-outline-primary" onClick={() => setIsStageModalOpen(true)}>
                Change Stage
              </button>
            </div>

            <div className="pipeline-progress-box">
              <div className="progress-stage-display">
                <div className="progress-stage-display__number">
                  {application.currentStage?.sequenceOrder || 1}
                </div>
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

          {/* Interview History / Schedule Section */}
          <div className="content-card">
            <div className="content-card__header">
              <h3>Scheduled Interviews ({interviews.length})</h3>
              <button className="btn btn-sm btn-primary" onClick={() => setIsScheduleModalOpen(true)}>
                + Schedule Interview
              </button>
            </div>

            {interviews.length === 0 ? (
              <div className="dashboard-empty-state">
                <p>No interviews scheduled for this candidate yet.</p>
                <button className="btn btn-sm btn-secondary mt-2" onClick={() => setIsScheduleModalOpen(true)}>
                  Schedule First Interview
                </button>
              </div>
            ) : (
              <div className="application-interviews-list">
                {interviews.map((int) => (
                  <div key={int.id} className="app-interview-card">
                    <div className="app-interview-card__header">
                      <div>
                        <h4>{int.stage?.name}</h4>
                        <span className="app-interview-card__time">
                          🕒 {new Date(int.scheduledAt).toLocaleString()}
                        </span>
                      </div>
                      <StatusBadge status={int.status} type="interview" />
                    </div>

                    <div className="app-interview-card__details">
                      {int.location && <div>📍 <strong>Location:</strong> {int.location}</div>}
                      {int.meetingLink && (
                        <div>
                          🔗 <strong>Meeting Link:</strong>{' '}
                          <a href={int.meetingLink} target="_blank" rel="noopener noreferrer" className="text-primary">
                            {int.meetingLink}
                          </a>
                        </div>
                      )}
                    </div>

                    <div className="app-interview-card__interviewers">
                      <strong>Assigned Interviewers:</strong>
                      <div className="interviewers-chip-list">
                        {int.interviewers.map((ass) => (
                          <span key={ass.id} className="interviewer-chip">
                            {ass.interviewer.name} ({ass.interviewer.role})
                            {ass.feedbackSubmitted ? ' • ✓ Submitted' : ' • Pending'}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="app-interview-card__footer">
                      <button
                        type="button"
                        className="btn btn-sm btn-secondary"
                        onClick={() => setSelectedInterviewForFeedback(int)}
                      >
                        💬 View Submitted Feedback
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar Info Column */}
        <div className="detail-sidebar-column">
          {/* Team Assignment Card */}
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
                <button className="btn btn-sm btn-outline-primary mt-2" onClick={() => setIsTeamModalOpen(true)}>
                  Assign to Team
                </button>
              </div>
            )}
          </div>

          {/* Status Details Card */}
          <div className="content-card">
            <div className="content-card__header">
              <h3>Application Status</h3>
              <button className="btn btn-sm btn-secondary" onClick={() => setIsStatusModalOpen(true)}>
                Update
              </button>
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
                <li>
                  <span>Applied On:</span>
                  <strong>{new Date(application.createdAt).toLocaleDateString()}</strong>
                </li>
                <li>
                  <span>Last Activity:</span>
                  <strong>{new Date(application.updatedAt).toLocaleDateString()}</strong>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

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

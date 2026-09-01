import React, { useState, useEffect } from 'react';
import { ApplicationStatus, Stage, TeamLookupItem } from '../../types/hr';
import { hrLookupsApi } from '../../api/hrLookups.api';

/* =========================================================================
   1. UPDATE APPLICATION STATUS MODAL
   ========================================================================= */
interface UpdateStatusModalProps {
  isOpen: boolean;
  currentStatus: ApplicationStatus;
  currentReason?: string | null;
  onClose: () => void;
  onSubmit: (status: ApplicationStatus, statusReason?: string) => Promise<void>;
  isLoading?: boolean;
}

export const UpdateStatusModal: React.FC<UpdateStatusModalProps> = ({
  isOpen,
  currentStatus,
  currentReason,
  onClose,
  onSubmit,
  isLoading = false
}) => {
  const [status, setStatus] = useState<ApplicationStatus>(currentStatus);
  const [statusReason, setStatusReason] = useState(currentReason || '');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setStatus(currentStatus);
    setStatusReason(currentReason || '');
  }, [currentStatus, currentReason, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (statusReason.length > 500) {
      setError('Status reason must not exceed 500 characters.');
      return;
    }

    try {
      await onSubmit(status, statusReason.trim() ? statusReason.trim() : undefined);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to update application status.');
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Update Application Status</h3>
          <button className="modal-close-btn" onClick={onClose}>&times;</button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          {error && <div className="modal-alert modal-alert--error">{error}</div>}

          <div className="form-group">
            <label htmlFor="app-status-select">Status *</label>
            <select
              id="app-status-select"
              className="form-select"
              value={status}
              onChange={(e) => setStatus(e.target.value as ApplicationStatus)}
              required
            >
              <option value="InProgress">In Progress</option>
              <option value="Hired">Hired</option>
              <option value="Rejected">Rejected</option>
              <option value="OnHold">On Hold</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="app-status-reason">Status Reason (Optional, max 500 characters)</label>
            <textarea
              id="app-status-reason"
              className="form-textarea"
              rows={3}
              placeholder="e.g. Strong technical skills, accepted offer, salary misalignment..."
              value={statusReason}
              onChange={(e) => setStatusReason(e.target.value)}
              maxLength={500}
            />
            <div className="form-char-count">{statusReason.length} / 500</div>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={isLoading}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={isLoading}>
              {isLoading ? 'Updating...' : 'Save Status'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

/* =========================================================================
   2. MOVE APPLICATION STAGE MODAL (WITH 409 GATING HANDLER)
   ========================================================================= */
interface MoveStageModalProps {
  isOpen: boolean;
  currentStageId: string;
  stages: Stage[];
  onClose: () => void;
  onSubmit: (stageId: string) => Promise<void>;
  isLoading?: boolean;
}

export const MoveStageModal: React.FC<MoveStageModalProps> = ({
  isOpen,
  currentStageId,
  stages,
  onClose,
  onSubmit,
  isLoading = false
}) => {
  const [selectedStageId, setSelectedStageId] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isGatingConflict, setIsGatingConflict] = useState(false);

  useEffect(() => {
    // Pick the first different stage by default
    const safeStages = stages || [];
    const firstOther = safeStages.find((s) => s.id !== currentStageId);
    setSelectedStageId(firstOther ? firstOther.id : currentStageId);
    setError(null);
    setIsGatingConflict(false);
  }, [currentStageId, stages, isOpen]);

  if (!isOpen) return null;

  const safeStages = stages || [];
  const currentStage = safeStages.find((s) => s.id === currentStageId);
  const targetStage = safeStages.find((s) => s.id === selectedStageId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsGatingConflict(false);

    if (selectedStageId === currentStageId) {
      setError('Please select a different stage to advance the candidate.');
      return;
    }

    try {
      await onSubmit(selectedStageId);
      onClose();
    } catch (err: any) {
      if (err?.error === 'ConflictError' || err?.message?.toLowerCase().includes('feedback') || err?.message?.toLowerCase().includes('gate')) {
        setIsGatingConflict(true);
      }
      setError(err?.message || 'Failed to advance application stage.');
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Move Candidate Stage</h3>
          <button className="modal-close-btn" onClick={onClose}>&times;</button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          {error && (
            <div className={`modal-alert ${isGatingConflict ? 'modal-alert--warning' : 'modal-alert--error'}`}>
              <strong>{isGatingConflict ? 'Feedback Gate Requirement:' : 'Cannot Move Stage:'}</strong> {error}
            </div>
          )}

          <div className="form-info-box">
            <div><strong>Current Stage:</strong> {currentStage ? currentStage.name : 'Unknown'}</div>
            {currentStage?.isGating && (
              <div className="form-info-tag">
                🔒 Gated Stage ({currentStage.feedbackRequiredCount} interview feedback submissions required)
              </div>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="target-stage-select">Select New Stage *</label>
            <select
              id="target-stage-select"
              className="form-select"
              value={selectedStageId}
              onChange={(e) => {
                setSelectedStageId(e.target.value);
                setError(null);
                setIsGatingConflict(false);
              }}
              required
            >
              {safeStages.map((s) => (
                <option key={s.id} value={s.id} disabled={s.id === currentStageId}>
                  Stage {s.sequenceOrder}: {s.name} {s.id === currentStageId ? '(Current)' : ''} {s.isGating ? `[Gated: ${s.feedbackRequiredCount} required]` : ''}
                </option>
              ))}
            </select>
          </div>

          {targetStage && (
            <p className="form-help-text">
              Target: Stage {targetStage.sequenceOrder} — {targetStage.name}
            </p>
          )}

          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={isLoading}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={isLoading || selectedStageId === currentStageId}>
              {isLoading ? 'Moving...' : 'Confirm Move'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

/* =========================================================================
   3. ASSIGN TEAM MODAL (WITH HUMAN-READABLE DROPDOWN VIA GET /api/v1/teams)
   ========================================================================= */
interface AssignTeamModalProps {
  isOpen: boolean;
  currentTeamId?: string | null;
  onClose: () => void;
  onSubmit: (teamId: string) => Promise<void>;
  isLoading?: boolean;
}

export const AssignTeamModal: React.FC<AssignTeamModalProps> = ({
  isOpen,
  currentTeamId,
  onClose,
  onSubmit,
  isLoading = false
}) => {
  const [teams, setTeams] = useState<TeamLookupItem[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');
  const [isFetchingTeams, setIsFetchingTeams] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      setIsFetchingTeams(true);
      hrLookupsApi.listTeams()
        .then((res) => {
          const list = res.data || [];
          setTeams(list);
          if (list.length > 0) {
            setSelectedTeamId(currentTeamId || list[0].id);
          }
        })
        .catch((err: any) => {
          setError(err?.message || 'Failed to load teams.');
        })
        .finally(() => {
          setIsFetchingTeams(false);
        });
    }
  }, [isOpen, currentTeamId]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!selectedTeamId) {
      setError('Please select a team.');
      return;
    }

    try {
      await onSubmit(selectedTeamId);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to assign team.');
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{currentTeamId ? 'Reassign Team' : 'Assign Team'}</h3>
          <button className="modal-close-btn" onClick={onClose}>&times;</button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          {error && <div className="modal-alert modal-alert--error">{error}</div>}

          {isFetchingTeams ? (
            <div className="modal-loading-text">Loading available teams...</div>
          ) : teams.length === 0 ? (
            <div className="modal-alert modal-alert--info">No teams found in the system.</div>
          ) : (
            <div className="form-group">
              <label htmlFor="team-select">Select Team *</label>
              <select
                id="team-select"
                className="form-select"
                value={selectedTeamId}
                onChange={(e) => setSelectedTeamId(e.target.value)}
                required
              >
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} {t.id === currentTeamId ? '(Currently Assigned)' : ''}
                  </option>
                ))}
              </select>
              <p className="form-help-text">
                Assigning a team allows Team Leads on that team to view candidates and conduct team interviews.
              </p>
            </div>
          )}

          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={isLoading}>
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isLoading || isFetchingTeams || teams.length === 0}
            >
              {isLoading ? 'Assigning...' : 'Save Assignment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

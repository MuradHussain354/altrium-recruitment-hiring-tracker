import React, { useState } from 'react';
import { Stage, CreateStageInput, UpdateStageInput } from '../../types/hr';

interface AddStageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateStageInput) => Promise<void>;
  isLoading?: boolean;
}

export const AddStageModal: React.FC<AddStageModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  isLoading = false
}) => {
  const [name, setName] = useState('');
  const [isGating, setIsGating] = useState(false);
  const [feedbackRequiredCount, setFeedbackRequiredCount] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (name.trim().length < 2) {
      setError('Stage name must be at least 2 characters.');
      return;
    }

    if (isGating && feedbackRequiredCount < 0) {
      setError('Feedback required count cannot be negative.');
      return;
    }

    try {
      await onSubmit({
        name: name.trim(),
        isGating,
        feedbackRequiredCount: isGating ? Number(feedbackRequiredCount) : 0
      });
      setName('');
      setIsGating(false);
      setFeedbackRequiredCount(0);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to create stage.');
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Add Pipeline Stage</h3>
          <button className="modal-close-btn" onClick={onClose}>&times;</button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          {error && <div className="modal-alert modal-alert--error">{error}</div>}

          <div className="form-group">
            <label htmlFor="stage-name">Stage Name *</label>
            <input
              id="stage-name"
              type="text"
              className="form-input"
              placeholder="e.g. Technical Interview, Screening"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              minLength={2}
            />
          </div>

          <div className="form-group form-group--checkbox">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={isGating}
                onChange={(e) => {
                  setIsGating(e.target.checked);
                  if (e.target.checked && feedbackRequiredCount === 0) {
                    setFeedbackRequiredCount(1);
                  }
                }}
              />
              <span>Enable Feedback Gating</span>
            </label>
            <p className="form-help-text">
              If enabled, candidates cannot advance past this stage until the required number of interview feedbacks are submitted.
            </p>
          </div>

          {isGating && (
            <div className="form-group">
              <label htmlFor="feedback-count">Required Feedbacks *</label>
              <input
                id="feedback-count"
                type="number"
                min="0"
                max="50"
                className="form-input"
                value={feedbackRequiredCount}
                onChange={(e) => setFeedbackRequiredCount(Math.max(0, parseInt(e.target.value, 10) || 0))}
                required
              />
            </div>
          )}

          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={isLoading}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={isLoading}>
              {isLoading ? 'Creating...' : 'Add Stage'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

interface EditStageModalProps {
  isOpen: boolean;
  stage: Stage | null;
  onClose: () => void;
  onSubmit: (stageId: string, data: UpdateStageInput) => Promise<void>;
  isLoading?: boolean;
}

export const EditStageModal: React.FC<EditStageModalProps> = ({
  isOpen,
  stage,
  onClose,
  onSubmit,
  isLoading = false
}) => {
  const [name, setName] = useState(stage?.name || '');
  const [isGating, setIsGating] = useState(stage?.isGating || false);
  const [feedbackRequiredCount, setFeedbackRequiredCount] = useState<number>(stage?.feedbackRequiredCount || 0);
  const [error, setError] = useState<string | null>(null);

  // Sync state if stage changes
  React.useEffect(() => {
    if (stage) {
      setName(stage.name);
      setIsGating(stage.isGating);
      setFeedbackRequiredCount(stage.feedbackRequiredCount);
    }
  }, [stage]);

  if (!isOpen || !stage) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (name.trim().length < 2) {
      setError('Stage name must be at least 2 characters.');
      return;
    }

    try {
      await onSubmit(stage.id, {
        name: name.trim(),
        isGating,
        feedbackRequiredCount: isGating ? Number(feedbackRequiredCount) : 0
      });
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to update stage.');
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Edit Stage: {stage.name}</h3>
          <button className="modal-close-btn" onClick={onClose}>&times;</button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          {error && <div className="modal-alert modal-alert--error">{error}</div>}

          <div className="form-group">
            <label htmlFor="edit-stage-name">Stage Name *</label>
            <input
              id="edit-stage-name"
              type="text"
              className="form-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              minLength={2}
            />
          </div>

          <div className="form-group form-group--checkbox">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={isGating}
                onChange={(e) => {
                  setIsGating(e.target.checked);
                  if (e.target.checked && feedbackRequiredCount === 0) {
                    setFeedbackRequiredCount(1);
                  }
                }}
              />
              <span>Enable Feedback Gating</span>
            </label>
            <p className="form-help-text">
              If enabled, stage progression requires completed interview feedback before moving candidate.
            </p>
          </div>

          {isGating && (
            <div className="form-group">
              <label htmlFor="edit-feedback-count">Required Feedbacks *</label>
              <input
                id="edit-feedback-count"
                type="number"
                min="0"
                max="50"
                className="form-input"
                value={feedbackRequiredCount}
                onChange={(e) => setFeedbackRequiredCount(Math.max(0, parseInt(e.target.value, 10) || 0))}
                required
              />
            </div>
          )}

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

import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { hrPositionsApi } from '../../api/hrPositions.api';
import { Position, Stage, CreateStageInput, UpdateStageInput } from '../../types/hr';
import { AddStageModal, EditStageModal } from '../../components/hr/StageModals';

export const HRPipelineEditorPage: React.FC = () => {
  const { positionId } = useParams<{ positionId: string }>();

  const [position, setPosition] = useState<Position | null>(null);
  const [stages, setStages] = useState<Stage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingStage, setEditingStage] = useState<Stage | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reorder state
  const [hasUnsavedOrder, setHasUnsavedOrder] = useState(false);
  const [isSavingOrder, setIsSavingOrder] = useState(false);

  const fetchPositionAndStages = async () => {
    if (!positionId) return;
    setIsLoading(true);
    setError(null);
    try {
      const [posRes, stageRes] = await Promise.all([
        hrPositionsApi.getPosition(positionId),
        hrPositionsApi.listStages(positionId)
      ]);
      setPosition(posRes.data);
      // Sort strictly by sequenceOrder ASC
      const sortedStages = (stageRes.data || []).sort((a, b) => a.sequenceOrder - b.sequenceOrder);
      setStages(sortedStages);
      setHasUnsavedOrder(false);
    } catch (err: any) {
      setError(err?.message || 'Failed to load pipeline stages.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPositionAndStages();
  }, [positionId]);

  const handleAddStage = async (data: CreateStageInput) => {
    if (!positionId) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await hrPositionsApi.createStage(positionId, data);
      setSuccessMessage('New stage added to pipeline.');
      await fetchPositionAndStages();
    } catch (err: any) {
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditStage = async (stageId: string, data: UpdateStageInput) => {
    if (!positionId) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await hrPositionsApi.updateStage(positionId, stageId, data);
      setSuccessMessage('Stage details updated.');
      await fetchPositionAndStages();
    } catch (err: any) {
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  };

  const moveStageUp = (index: number) => {
    if (index <= 0) return;
    const newStages = [...stages];
    const temp = newStages[index - 1];
    newStages[index - 1] = newStages[index];
    newStages[index] = temp;
    setStages(newStages);
    setHasUnsavedOrder(true);
  };

  const moveStageDown = (index: number) => {
    if (index >= stages.length - 1) return;
    const newStages = [...stages];
    const temp = newStages[index + 1];
    newStages[index + 1] = newStages[index];
    newStages[index] = temp;
    setStages(newStages);
    setHasUnsavedOrder(true);
  };

  const handleSaveReorder = async () => {
    if (!positionId) return;
    setIsSavingOrder(true);
    setError(null);
    setSuccessMessage(null);

    // Build contiguous 1..N sequence
    const reorderPayload = stages.map((stage, idx) => ({
      stageId: stage.id,
      sequenceOrder: idx + 1
    }));

    try {
      const res = await hrPositionsApi.reorderStages(positionId, reorderPayload);
      const sorted = (res.data || []).sort((a, b) => a.sequenceOrder - b.sequenceOrder);
      setStages(sorted);
      setHasUnsavedOrder(false);
      setSuccessMessage('Pipeline sequence reordered successfully.');
    } catch (err: any) {
      setError(err?.message || 'Failed to save pipeline order.');
    } finally {
      setIsSavingOrder(false);
    }
  };

  if (isLoading) {
    return (
      <div className="page-container hr-pipeline-editor-page">
        <div className="page-loading-state">
          <div className="spinner"></div>
          <p>Loading pipeline stages...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container hr-pipeline-editor-page">
      <div className="page-header">
        <div>
          <div className="breadcrumb">
            <Link to="/hr/positions">Positions</Link> &gt;{' '}
            <Link to={`/hr/positions/${position?.id}`}>{position?.title || 'Position'}</Link> &gt;{' '}
            <span>Pipeline Editor</span>
          </div>
          <h1 className="page-title">Pipeline Stages: {position?.title}</h1>
          <p className="page-subtitle">
            Configure recruitment stages, interview sequence, and feedback gating rules.
          </p>
        </div>

        <div className="page-actions">
          <button className="btn btn-primary" onClick={() => setIsAddModalOpen(true)}>
            + Add Stage
          </button>
        </div>
      </div>

      {error && <div className="page-alert page-alert--error mb-4">{error}</div>}
      {successMessage && <div className="page-alert page-alert--success mb-4">{successMessage}</div>}

      {hasUnsavedOrder && (
        <div className="unsaved-order-banner">
          <div>
            <strong>You have unsaved stage order changes!</strong>
            <p>Remember to save your changes to persist the new recruitment sequence.</p>
          </div>
          <div className="banner-actions">
            <button className="btn btn-sm btn-secondary" onClick={() => fetchPositionAndStages()} disabled={isSavingOrder}>
              Reset
            </button>
            <button className="btn btn-sm btn-primary" onClick={handleSaveReorder} disabled={isSavingOrder}>
              {isSavingOrder ? 'Saving...' : '💾 Save Pipeline Order'}
            </button>
          </div>
        </div>
      )}

      {stages.length === 0 ? (
        <div className="empty-state-card">
          <h3>No stages in this pipeline</h3>
          <p>Candidates cannot apply to an open position until at least one stage (e.g. Applied / Screening) is created.</p>
          <button className="btn btn-primary btn-sm mt-3" onClick={() => setIsAddModalOpen(true)}>
            + Add First Stage
          </button>
        </div>
      ) : (
        <div className="stages-sequence-container">
          <div className="stages-list">
            {stages.map((stage, idx) => (
              <div key={stage.id} className="stage-item-card">
                <div className="stage-item-card__sequence">
                  <span className="sequence-badge">{idx + 1}</span>
                </div>

                <div className="stage-item-card__info">
                  <div className="stage-item-card__name-row">
                    <h4 className="stage-item-card__name">{stage.name}</h4>
                    {stage.isGating && (
                      <span className="gating-badge">
                        🔒 Feedback Gate ({stage.feedbackRequiredCount} {stage.feedbackRequiredCount === 1 ? 'review' : 'reviews'} required)
                      </span>
                    )}
                  </div>
                  <span className="stage-item-card__meta">
                    {stage.isGating
                      ? 'Candidates cannot advance to next stages without required interview feedback.'
                      : 'Non-gating stage. Candidates can be advanced freely.'}
                  </span>
                </div>

                <div className="stage-item-card__controls">
                  <div className="reorder-btn-group">
                    <button
                      type="button"
                      className="btn-icon"
                      title="Move Up"
                      onClick={() => moveStageUp(idx)}
                      disabled={idx === 0}
                    >
                      ▲
                    </button>
                    <button
                      type="button"
                      className="btn-icon"
                      title="Move Down"
                      onClick={() => moveStageDown(idx)}
                      disabled={idx === stages.length - 1}
                    >
                      ▼
                    </button>
                  </div>

                  <button
                    type="button"
                    className="btn btn-sm btn-secondary"
                    onClick={() => setEditingStage(stage)}
                  >
                    ✏️ Edit
                  </button>
                </div>
              </div>
            ))}
          </div>

          {hasUnsavedOrder && (
            <div className="stages-footer-save">
              <button
                type="button"
                className="btn btn-primary btn-lg"
                onClick={handleSaveReorder}
                disabled={isSavingOrder}
              >
                {isSavingOrder ? 'Saving Order...' : 'Save Pipeline Order'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Add Stage Modal */}
      <AddStageModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSubmit={handleAddStage}
        isLoading={isSubmitting}
      />

      {/* Edit Stage Modal */}
      <EditStageModal
        isOpen={!!editingStage}
        stage={editingStage}
        onClose={() => setEditingStage(null)}
        onSubmit={handleEditStage}
        isLoading={isSubmitting}
      />
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { hrPositionsApi } from '../../api/hrPositions.api';
import { Position, PositionStatus, UpdatePositionInput } from '../../types/hr';
import { StatusBadge } from '../../components/hr/StatusBadge';

export const HRPositionDetailPage: React.FC = () => {
  const { positionId } = useParams<{ positionId: string }>();

  const [position, setPosition] = useState<Position | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Edit mode state
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDepartment, setEditDepartment] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editSkillsInput, setEditSkillsInput] = useState('');
  const [editHeadcount, setEditHeadcount] = useState<number>(1);
  const [isSaving, setIsSaving] = useState(false);

  // Status change state
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  const fetchPosition = async () => {
    if (!positionId) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await hrPositionsApi.getPosition(positionId);
      setPosition(res.data);
      setEditTitle(res.data.title);
      setEditDepartment(res.data.department);
      setEditDescription(res.data.description);
      setEditSkillsInput(res.data.requiredSkills || '');
      setEditHeadcount(res.data.headcount);
    } catch (err: any) {
      setError(err?.message || 'Failed to load position details.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPosition();
  }, [positionId]);

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!positionId) return;
    setError(null);
    setSuccessMessage(null);

    const payload: UpdatePositionInput = {
      title: editTitle.trim(),
      department: editDepartment.trim(),
      description: editDescription.trim(),
      requiredSkills: editSkillsInput.trim() ? editSkillsInput.trim() : undefined,
      headcount: Number(editHeadcount)
    };

    setIsSaving(true);
    try {
      const res = await hrPositionsApi.updatePosition(positionId, payload);
      setPosition(res.data);
      setIsEditing(false);
      setSuccessMessage('Position details updated successfully.');
    } catch (err: any) {
      setError(err?.message || 'Failed to update position details.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleStatusChange = async (newStatus: PositionStatus) => {
    if (!positionId || !position || position.status === newStatus) return;
    setError(null);
    setSuccessMessage(null);
    setIsUpdatingStatus(true);
    try {
      const res = await hrPositionsApi.updatePositionStatus(positionId, newStatus);
      setPosition(res.data);
      setSuccessMessage(`Position status updated to ${newStatus}.`);
    } catch (err: any) {
      setError(err?.message || 'Failed to change position status.');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  if (isLoading) {
    return (
      <div className="page-container hr-position-detail-page">
        <div className="page-loading-state">
          <div className="spinner"></div>
          <p>Loading position details...</p>
        </div>
      </div>
    );
  }

  if (error && !position) {
    return (
      <div className="page-container hr-position-detail-page">
        <div className="page-alert page-alert--error">{error}</div>
        <Link to="/hr/positions" className="btn btn-secondary mt-3">← Back to Positions</Link>
      </div>
    );
  }

  if (!position) return null;

  return (
    <div className="page-container hr-position-detail-page">
      <div className="page-header">
        <div>
          <div className="breadcrumb">
            <Link to="/hr/positions">Positions</Link> &gt; <span>{position.title}</span>
          </div>
          <div className="page-title-row">
            <h1 className="page-title">{position.title}</h1>
            <StatusBadge status={position.status} type="position" />
          </div>
          <p className="page-subtitle">Department: <strong>{position.department}</strong> • Headcount: <strong>{position.headcount}</strong></p>
        </div>

        <div className="page-actions">
          <Link to={`/hr/positions/${position.id}/pipeline`} className="btn btn-outline-primary">
            🪜 Manage Pipeline Stages
          </Link>
          <Link to={`/hr/applications?positionId=${position.id}`} className="btn btn-secondary">
            📄 View Applications
          </Link>
        </div>
      </div>

      {error && <div className="page-alert page-alert--error mb-4">{error}</div>}
      {successMessage && <div className="page-alert page-alert--success mb-4">{successMessage}</div>}

      <div className="detail-layout-grid">
        {/* Main Details Panel */}
        <div className="detail-main-column">
          <div className="content-card">
            <div className="content-card__header">
              <h3>Role Description & Requirements</h3>
              {!isEditing && (
                <button className="btn btn-sm btn-secondary" onClick={() => setIsEditing(true)}>
                  ✏️ Edit Details
                </button>
              )}
            </div>

            {isEditing ? (
              <form onSubmit={handleSaveEdit} className="mt-3">
                <div className="form-row">
                  <div className="form-group form-group--half">
                    <label>Job Title *</label>
                    <input
                      type="text"
                      className="form-input"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      required
                      minLength={2}
                    />
                  </div>
                  <div className="form-group form-group--half">
                    <label>Department *</label>
                    <input
                      type="text"
                      className="form-input"
                      value={editDepartment}
                      onChange={(e) => setEditDepartment(e.target.value)}
                      required
                      minLength={2}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Description *</label>
                  <textarea
                    className="form-textarea"
                    rows={6}
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    required
                    minLength={10}
                  />
                </div>

                <div className="form-row">
                  <div className="form-group form-group--half">
                    <label>Required Skills (comma-separated)</label>
                    <input
                      type="text"
                      className="form-input"
                      value={editSkillsInput}
                      onChange={(e) => setEditSkillsInput(e.target.value)}
                    />
                  </div>
                  <div className="form-group form-group--half">
                    <label>Headcount *</label>
                    <input
                      type="number"
                      min="1"
                      className="form-input"
                      value={editHeadcount}
                      onChange={(e) => setEditHeadcount(Math.max(1, parseInt(e.target.value, 10) || 1))}
                      required
                    />
                  </div>
                </div>

                <div className="form-actions mt-3">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => {
                      setIsEditing(false);
                      setEditTitle(position.title);
                      setEditDepartment(position.department);
                      setEditDescription(position.description);
                      setEditSkillsInput(position.requiredSkills || '');
                      setEditHeadcount(position.headcount);
                    }}
                    disabled={isSaving}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={isSaving}>
                    {isSaving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            ) : (
              <div className="position-view-details">
                <div className="detail-section">
                  <h4>Description</h4>
                  <div className="description-text">{position.description}</div>
                </div>

                <div className="detail-section">
                  <h4>Required Skills</h4>
                  {position.requiredSkills ? (
                    <div className="skills-tag-list">
                      {position.requiredSkills
                        .split(',')
                        .map((skill) => skill.trim())
                        .filter(Boolean)
                        .map((skill, idx) => (
                          <span key={idx} className="skill-pill skill-pill--lg">{skill}</span>
                        ))}
                    </div>
                  ) : (
                    <p className="text-muted">No specific skills listed.</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar Controls Column */}
        <div className="detail-sidebar-column">
          {/* Status Control Card */}
          <div className="content-card">
            <div className="content-card__header">
              <h3>Requisition Status</h3>
            </div>
            <p className="form-help-text">Change the visibility and hiring status of this position.</p>

            <div className="status-button-group">
              {(['Draft', 'Open', 'OnHold', 'Closed'] as PositionStatus[]).map((st) => (
                <button
                  key={st}
                  type="button"
                  className={`btn-status-option ${position.status === st ? 'active' : ''} btn-status-option--${st.toLowerCase()}`}
                  onClick={() => handleStatusChange(st)}
                  disabled={isUpdatingStatus || position.status === st}
                >
                  <span className="dot"></span>
                  {st === 'OnHold' ? 'On Hold' : st}
                  {position.status === st && ' (Active)'}
                </button>
              ))}
            </div>
          </div>

          {/* Quick Metrics & Links Card */}
          <div className="content-card">
            <div className="content-card__header">
              <h3>Requisition Info</h3>
            </div>
            <ul className="info-meta-list">
              <li>
                <span>Created:</span>
                <strong>{new Date(position.createdAt).toLocaleDateString()}</strong>
              </li>
              <li>
                <span>Last Updated:</span>
                <strong>{new Date(position.updatedAt).toLocaleDateString()}</strong>
              </li>
              <li>
                <span>Pipeline Stages:</span>
                <Link to={`/hr/positions/${position.id}/pipeline`} className="text-primary">
                  Configure Stages →
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

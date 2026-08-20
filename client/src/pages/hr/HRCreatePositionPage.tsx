import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { hrPositionsApi } from '../../api/hrPositions.api';

export const HRCreatePositionPage: React.FC = () => {
  const navigate = useNavigate();

  const [title, setTitle] = useState('');
  const [department, setDepartment] = useState('');
  const [description, setDescription] = useState('');
  const [skillsInput, setSkillsInput] = useState('');
  const [headcount, setHeadcount] = useState<number>(1);
  const [status, setStatus] = useState<'Draft' | 'Open'>('Draft');

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (title.trim().length < 2) {
      setError('Position title must be at least 2 characters.');
      return;
    }

    if (department.trim().length < 2) {
      setError('Department name must be at least 2 characters.');
      return;
    }

    if (description.trim().length < 10) {
      setError('Job description must be at least 10 characters.');
      return;
    }

    if (headcount < 1) {
      setError('Headcount must be at least 1.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await hrPositionsApi.createPosition({
        title: title.trim(),
        department: department.trim(),
        description: description.trim(),
        requiredSkills: skillsInput.trim() ? skillsInput.trim() : undefined,
        headcount: Number(headcount),
        status
      });

      // Redirect to position detail
      navigate(`/hr/positions/${res.data.id}`);
    } catch (err: any) {
      setError(err?.message || 'Failed to create job position.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="page-container hr-create-position-page">
      <div className="page-header">
        <div>
          <div className="breadcrumb">
            <Link to="/hr/positions">Positions</Link> &gt; <span>New Position</span>
          </div>
          <h1 className="page-title">Create Job Position</h1>
          <p className="page-subtitle">Draft a new job requisition and configure requirements for recruitment.</p>
        </div>
      </div>

      <div className="form-card">
        {error && <div className="page-alert page-alert--error mb-4">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group form-group--half">
              <label htmlFor="pos-title">Job Title *</label>
              <input
                id="pos-title"
                type="text"
                className="form-input"
                placeholder="e.g. Senior Backend Engineer"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                minLength={2}
              />
            </div>

            <div className="form-group form-group--half">
              <label htmlFor="pos-dept">Department *</label>
              <input
                id="pos-dept"
                type="text"
                className="form-input"
                placeholder="e.g. Engineering, Product, Marketing"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                required
                minLength={2}
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="pos-desc">Job Description *</label>
            <textarea
              id="pos-desc"
              className="form-textarea"
              rows={6}
              placeholder="Describe the role responsibilities, team environment, and core mission (min 10 characters)..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              minLength={10}
            />
          </div>

          <div className="form-row">
            <div className="form-group form-group--half">
              <label htmlFor="pos-skills">Required Skills (Comma separated)</label>
              <input
                id="pos-skills"
                type="text"
                className="form-input"
                placeholder="e.g. TypeScript, Node.js, PostgreSQL, Docker"
                value={skillsInput}
                onChange={(e) => setSkillsInput(e.target.value)}
              />
              <p className="form-help-text">Enter skills separated by commas.</p>
            </div>

            <div className="form-group form-group--half">
              <label htmlFor="pos-headcount">Headcount (Openings) *</label>
              <input
                id="pos-headcount"
                type="number"
                min="1"
                max="999"
                className="form-input"
                value={headcount}
                onChange={(e) => setHeadcount(Math.max(1, parseInt(e.target.value, 10) || 1))}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="pos-status">Initial Status</label>
            <select
              id="pos-status"
              className="form-select"
              value={status}
              onChange={(e) => setStatus(e.target.value as 'Draft' | 'Open')}
            >
              <option value="Draft">Draft (Internal preparation, not shown on public careers)</option>
              <option value="Open">Open (Live for public candidate applications)</option>
            </select>
          </div>

          <div className="form-actions">
            <Link to="/hr/positions" className="btn btn-secondary">
              Cancel
            </Link>
            <button type="submit" className="btn btn-primary" disabled={isLoading}>
              {isLoading ? 'Creating Requisition...' : 'Create Position'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

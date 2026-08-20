import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { hrPositionsApi } from '../../api/hrPositions.api';
import { Position, PositionStatus } from '../../types/hr';
import { StatusBadge } from '../../components/hr/StatusBadge';

export const HRPositionsPage: React.FC = () => {
  const [positions, setPositions] = useState<Position[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<PositionStatus | ''>('');

  const fetchPositions = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await hrPositionsApi.listPositions({
        department: departmentFilter || undefined,
        status: statusFilter || undefined
      });
      setPositions(res.data || []);
    } catch (err: any) {
      setError(err?.message || 'Failed to load positions.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPositions();
  }, [departmentFilter, statusFilter]);

  // Extract unique departments for dropdown
  const departments = Array.from(new Set(positions.map((p) => p.department).filter(Boolean)));

  // Client-side search filtering
  const filteredPositions = positions.filter((p) => {
    if (!searchTerm.trim()) return true;
    const query = searchTerm.toLowerCase();
    const matchesTitle = p.title.toLowerCase().includes(query);
    const matchesDept = p.department.toLowerCase().includes(query);
    const matchesSkills = p.requiredSkills?.toLowerCase().includes(query);
    return matchesTitle || matchesDept || matchesSkills;
  });

  return (
    <div className="page-container hr-positions-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Job Positions</h1>
          <p className="page-subtitle">Create and manage job requisitions, hiring pipelines, and requirements.</p>
        </div>
        <div className="page-actions">
          <Link to="/hr/positions/new" className="btn btn-primary">
            + Create Position
          </Link>
        </div>
      </div>

      {error && <div className="page-alert page-alert--error">{error}</div>}

      {/* Filter Toolbar */}
      <div className="filter-toolbar">
        <div className="filter-group filter-group--search">
          <input
            type="text"
            className="form-input search-input"
            placeholder="Search by title, skill, or department..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="filter-group">
          <select
            className="form-select"
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
          >
            <option value="">All Departments</option>
            {departments.map((dept) => (
              <option key={dept} value={dept}>{dept}</option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <select
            className="form-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as PositionStatus | '')}
          >
            <option value="">All Statuses</option>
            <option value="Draft">Draft</option>
            <option value="Open">Open</option>
            <option value="OnHold">On Hold</option>
            <option value="Closed">Closed</option>
          </select>
        </div>

        {(searchTerm || departmentFilter || statusFilter) && (
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => {
              setSearchTerm('');
              setDepartmentFilter('');
              setStatusFilter('');
            }}
          >
            Reset Filters
          </button>
        )}
      </div>

      {/* Position List */}
      {isLoading ? (
        <div className="page-loading-state">
          <div className="spinner"></div>
          <p>Loading positions...</p>
        </div>
      ) : filteredPositions.length === 0 ? (
        <div className="empty-state-card">
          <h3>No positions found</h3>
          <p>Try adjusting your search query or status filters, or create a new job position.</p>
          <Link to="/hr/positions/new" className="btn btn-primary btn-sm mt-3">
            Create Position
          </Link>
        </div>
      ) : (
        <div className="positions-grid">
          {filteredPositions.map((pos) => {
            const skillsArray = pos.requiredSkills
              ? pos.requiredSkills.split(',').map((s) => s.trim()).filter(Boolean)
              : [];

            return (
              <div key={pos.id} className="position-card">
                <div className="position-card__header">
                  <div>
                    <span className="position-card__department">{pos.department}</span>
                    <h3 className="position-card__title">
                      <Link to={`/hr/positions/${pos.id}`}>{pos.title}</Link>
                    </h3>
                  </div>
                  <StatusBadge status={pos.status} type="position" />
                </div>

                <p className="position-card__desc">
                  {pos.description?.length > 130
                    ? `${pos.description.slice(0, 130)}...`
                    : pos.description}
                </p>

                {skillsArray.length > 0 && (
                  <div className="position-card__skills">
                    {skillsArray.slice(0, 4).map((skill, idx) => (
                      <span key={idx} className="skill-pill">{skill}</span>
                    ))}
                    {skillsArray.length > 4 && (
                      <span className="skill-pill skill-pill--more">+{skillsArray.length - 4}</span>
                    )}
                  </div>
                )}

              <div className="position-card__meta">
                <span>👥 Headcount: <strong>{pos.headcount}</strong></span>
                {pos._count && (
                  <>
                    <span>🪜 Stages: <strong>{pos._count.stages ?? 0}</strong></span>
                    <span>📄 Applications: <strong>{pos._count.applications ?? 0}</strong></span>
                  </>
                )}
              </div>

                <div className="position-card__footer">
                  <Link to={`/hr/positions/${pos.id}`} className="btn btn-sm btn-secondary">
                    Details & Edit
                  </Link>
                  <Link to={`/hr/positions/${pos.id}/pipeline`} className="btn btn-sm btn-outline-primary">
                    Pipeline Editor →
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

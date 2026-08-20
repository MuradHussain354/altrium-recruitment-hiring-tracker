import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { hrApplicationsApi } from '../../api/hrApplications.api';
import { hrPositionsApi } from '../../api/hrPositions.api';
import { Application, Position, Stage, ApplicationStatus } from '../../types/hr';
import { StatusBadge } from '../../components/hr/StatusBadge';

export const HRApplicationsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const [applications, setApplications] = useState<Application[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [stages, setStages] = useState<Stage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters initialized from URL query params
  const [positionFilter, setPositionFilter] = useState<string>(searchParams.get('positionId') || '');
  const [stageFilter, setStageFilter] = useState<string>(searchParams.get('stageId') || '');
  const [statusFilter, setStatusFilter] = useState<ApplicationStatus | ''>(
    (searchParams.get('status') as ApplicationStatus) || ''
  );
  const [searchInput, setSearchInput] = useState<string>(searchParams.get('search') || '');
  const [debouncedSearch, setDebouncedSearch] = useState<string>(searchInput);

  // Load positions for the position dropdown
  useEffect(() => {
    hrPositionsApi.listPositions()
      .then((res) => setPositions(res.data || []))
      .catch((err) => console.error('Failed to load positions for filter:', err));
  }, []);

  // When positionFilter changes, fetch its stages for stage dropdown
  useEffect(() => {
    if (positionFilter) {
      hrPositionsApi.listStages(positionFilter)
        .then((res) => {
          setStages((res.data || []).sort((a, b) => a.sequenceOrder - b.sequenceOrder));
        })
        .catch(() => setStages([]));
    } else {
      setStages([]);
      setStageFilter('');
    }
  }, [positionFilter]);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Sync URL search params
  useEffect(() => {
    const params: Record<string, string> = {};
    if (positionFilter) params.positionId = positionFilter;
    if (stageFilter) params.stageId = stageFilter;
    if (statusFilter) params.status = statusFilter;
    if (debouncedSearch) params.search = debouncedSearch;
    setSearchParams(params, { replace: true });
  }, [positionFilter, stageFilter, statusFilter, debouncedSearch]);

  // Fetch applications
  const fetchApplications = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await hrApplicationsApi.listApplications({
        positionId: positionFilter || undefined,
        stageId: stageFilter || undefined,
        status: statusFilter || undefined,
        search: debouncedSearch || undefined
      });
      setApplications(res.data || []);
    } catch (err: any) {
      setError(err?.message || 'Failed to load applications.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications();
  }, [positionFilter, stageFilter, statusFilter, debouncedSearch]);

  return (
    <div className="page-container hr-applications-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Candidate Applications</h1>
          <p className="page-subtitle">Review, evaluate, advance, and assign candidates through hiring pipelines.</p>
        </div>
      </div>

      {error && <div className="page-alert page-alert--error">{error}</div>}

      {/* Filter Toolbar */}
      <div className="filter-toolbar">
        <div className="filter-group filter-group--search">
          <input
            type="text"
            className="form-input search-input"
            placeholder="Search candidate name or email..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>

        <div className="filter-group">
          <select
            className="form-select"
            value={positionFilter}
            onChange={(e) => {
              setPositionFilter(e.target.value);
              setStageFilter('');
            }}
          >
            <option value="">All Positions</option>
            {positions.map((pos) => (
              <option key={pos.id} value={pos.id}>{pos.title}</option>
            ))}
          </select>
        </div>

        {positionFilter && stages.length > 0 && (
          <div className="filter-group">
            <select
              className="form-select"
              value={stageFilter}
              onChange={(e) => setStageFilter(e.target.value)}
            >
              <option value="">All Stages</option>
              {stages.map((s) => (
                <option key={s.id} value={s.id}>Stage {s.sequenceOrder}: {s.name}</option>
              ))}
            </select>
          </div>
        )}

        <div className="filter-group">
          <select
            className="form-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as ApplicationStatus | '')}
          >
            <option value="">All Statuses</option>
            <option value="InProgress">In Progress</option>
            <option value="Hired">Hired</option>
            <option value="Rejected">Rejected</option>
            <option value="OnHold">On Hold</option>
          </select>
        </div>

        {(searchInput || positionFilter || stageFilter || statusFilter) && (
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => {
              setSearchInput('');
              setPositionFilter('');
              setStageFilter('');
              setStatusFilter('');
            }}
          >
            Reset Filters
          </button>
        )}
      </div>

      {/* Application Table */}
      {isLoading ? (
        <div className="page-loading-state">
          <div className="spinner"></div>
          <p>Loading applications...</p>
        </div>
      ) : applications.length === 0 ? (
        <div className="empty-state-card">
          <h3>No applications found</h3>
          <p>Try clearing your search query or selecting a different filter.</p>
        </div>
      ) : (
        <div className="content-card">
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Candidate</th>
                  <th>Position</th>
                  <th>Stage</th>
                  <th>Assigned Team</th>
                  <th>Status</th>
                  <th>Applied On</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {applications.map((app) => (
                  <tr key={app.id}>
                    <td>
                      <div className="table-user-cell">
                        <strong>
                          <Link to={`/hr/applications/${app.id}`}>{app.candidate?.name}</Link>
                        </strong>
                        <span className="table-subtext">{app.candidate?.email}</span>
                      </div>
                    </td>
                    <td>
                      <Link to={`/hr/positions/${app.position?.id}`} className="position-link">
                        {app.position?.title}
                      </Link>
                      <span className="table-subtext">{app.position?.department}</span>
                    </td>
                    <td>
                      <span className="stage-pill">
                        {app.currentStage?.name || 'Stage 1'}
                        {app.currentStage?.isGating && ' 🔒'}
                      </span>
                    </td>
                    <td>
                      {app.assignedTeam ? (
                        <span className="team-pill">🏢 {app.assignedTeam.name}</span>
                      ) : (
                        <span className="text-muted">Unassigned</span>
                      )}
                    </td>
                    <td>
                      <StatusBadge status={app.status} type="application" />
                    </td>
                    <td>
                      {new Date(app.createdAt).toLocaleDateString()}
                    </td>
                    <td>
                      <Link to={`/hr/applications/${app.id}`} className="btn btn-sm btn-primary">
                        Review →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="table-footer-info">
            Showing {applications.length} candidate applications
          </div>
        </div>
      )}
    </div>
  );
};

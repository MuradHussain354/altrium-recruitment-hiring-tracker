import React, { useState, useEffect, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { hrApplicationsApi } from '../../api/hrApplications.api';
import { hrPositionsApi } from '../../api/hrPositions.api';
import { hrLookupsApi } from '../../api/hrLookups.api';
import { Application, Position, Stage, ApplicationStatus } from '../../types/hr';
import { StatusBadge } from '../../components/hr/StatusBadge';
import {
  bulkChangeStatus,
  bulkChangeStage,
  bulkAssignTeam,
  downloadExportExcel,
  downloadExportPdf,
  getMySavedFilters,
  createSavedFilter,
  deleteSavedFilter,
} from '../../api/batch2.api';
import { SavedFilter } from '../../types/hr';

interface BulkResult {
  applicationId: string;
  success: boolean;
  message?: string;
  error?: string;
  reason?: string;
}

export const HRApplicationsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const [applications, setApplications] = useState<Application[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [stages, setStages] = useState<Stage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Filters initialized from URL query params
  const [positionFilter, setPositionFilter] = useState<string>(searchParams.get('positionId') || '');
  const [stageFilter, setStageFilter] = useState<string>(searchParams.get('stageId') || '');
  const [statusFilter, setStatusFilter] = useState<ApplicationStatus | ''>(
    (searchParams.get('status') as ApplicationStatus) || ''
  );
  const [searchInput, setSearchInput] = useState<string>(searchParams.get('search') || '');
  const [debouncedSearch, setDebouncedSearch] = useState<string>(searchInput);

  // ── BULK SELECTION ───────────────────────────────────────────────────────────
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkLoading, setIsBulkLoading] = useState(false);
  const [bulkResults, setBulkResults] = useState<BulkResult[] | null>(null);
  const [bulkAction, setBulkAction] = useState<'status' | 'stage' | 'team' | null>(null);
  // values for bulk action
  const [bulkStatusValue, setBulkStatusValue] = useState<ApplicationStatus>('InProgress');
  const [bulkStatusReason, setBulkStatusReason] = useState('');
  const [bulkStageValue, setBulkStageValue] = useState('');
  const [bulkTeamValue, setBulkTeamValue] = useState('');
  const [teams, setTeams] = useState<{ id: string; name: string }[]>([]);
  const [allStages, setAllStages] = useState<Stage[]>([]);

  // ── SAVED FILTERS ────────────────────────────────────────────────────────────
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>([]);
  const [showSavedFilters, setShowSavedFilters] = useState(false);
  const [saveFilterName, setSaveFilterName] = useState('');
  const [isSavingFilter, setIsSavingFilter] = useState(false);
  const savedFilterRef = useRef<HTMLDivElement>(null);

  // Load positions for the position dropdown
  useEffect(() => {
    hrPositionsApi.listPositions()
      .then((res) => setPositions(res.data || []))
      .catch((err) => console.error('Failed to load positions for filter:', err));

    hrLookupsApi.listTeams()
      .then((res) => setTeams(res.data || []))
      .catch(() => setTeams([]));

    loadSavedFilters();
  }, []);

  const loadSavedFilters = async () => {
    try {
      const filters = await getMySavedFilters();
      setSavedFilters(filters || []);
    } catch { setSavedFilters([]); }
  };

  // When positionFilter changes, fetch its stages for stage dropdown
  useEffect(() => {
    if (positionFilter) {
      hrPositionsApi.listStages(positionFilter)
        .then((res) => {
          const sorted = (res.data || []).sort((a, b) => a.sequenceOrder - b.sequenceOrder);
          setStages(sorted);
          // For bulk actions, accumulate all position stages
          setAllStages((prev) => {
            const existing = new Set(prev.map((s) => s.id));
            return [...prev, ...sorted.filter((s) => !existing.has(s.id))];
          });
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
    setBulkResults(null);
    try {
      const res = await hrApplicationsApi.listApplications({
        positionId: positionFilter || undefined,
        stageId: stageFilter || undefined,
        status: statusFilter || undefined,
        search: debouncedSearch || undefined
      });
      setApplications(res.data || []);
      setSelectedIds(new Set());
    } catch (err: any) {
      setError(err?.message || 'Failed to load applications.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications();
  }, [positionFilter, stageFilter, statusFilter, debouncedSearch]);

  // Close saved filter dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (savedFilterRef.current && !savedFilterRef.current.contains(e.target as Node)) {
        setShowSavedFilters(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ── SELECTION HELPERS ────────────────────────────────────────────────────────
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === applications.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(applications.map((a) => a.id)));
    }
  };

  const selectedCount = selectedIds.size;
  const selectedArray = Array.from(selectedIds);

  // ── BULK ACTIONS ─────────────────────────────────────────────────────────────
  const handleBulkStatusChange = async () => {
    if (!selectedArray.length) return;
    setIsBulkLoading(true);
    setBulkResults(null);
    try {
      const result = await bulkChangeStatus(selectedArray, bulkStatusValue, bulkStatusReason || undefined);
      setBulkResults(result?.results || []);
      await fetchApplications();
    } catch (err: any) {
      setError(err?.message || 'Bulk status change failed.');
    } finally {
      setIsBulkLoading(false);
      setBulkAction(null);
    }
  };

  const handleBulkStageChange = async () => {
    if (!selectedArray.length || !bulkStageValue) return;
    setIsBulkLoading(true);
    setBulkResults(null);
    try {
      const result = await bulkChangeStage(selectedArray, bulkStageValue);
      setBulkResults(result?.results || []);
      await fetchApplications();
    } catch (err: any) {
      setError(err?.message || 'Bulk stage change failed.');
    } finally {
      setIsBulkLoading(false);
      setBulkAction(null);
    }
  };

  const handleBulkTeamAssign = async () => {
    if (!selectedArray.length) return;
    setIsBulkLoading(true);
    setBulkResults(null);
    try {
      const result = await bulkAssignTeam(selectedArray, bulkTeamValue || null);
      setBulkResults(result?.results || []);
      await fetchApplications();
    } catch (err: any) {
      setError(err?.message || 'Bulk team assignment failed.');
    } finally {
      setIsBulkLoading(false);
      setBulkAction(null);
    }
  };

  // ── SAVED FILTERS ────────────────────────────────────────────────────────────
  const handleSaveFilter = async () => {
    const name = saveFilterName.trim();
    if (!name) return;
    setIsSavingFilter(true);
    setError(null);
    try {
      await createSavedFilter(name, {
        positionId: positionFilter || undefined,
        stageId: stageFilter || undefined,
        status: statusFilter || undefined,
        search: debouncedSearch || undefined,
      });
      setSaveFilterName('');
      setShowSavedFilters(false);
      setSuccessMessage(`Filter preset "${name}" saved successfully.`);
      setTimeout(() => setSuccessMessage(null), 3500);
      await loadSavedFilters();
    } catch (err: any) {
      setError(err?.message || 'Failed to save filter.');
    } finally {
      setIsSavingFilter(false);
    }
  };

  const handleApplySavedFilter = (f: SavedFilter) => {
    const searchVal = f.filterData.search || '';
    setPositionFilter(f.filterData.positionId || '');
    setStageFilter(f.filterData.stageId || '');
    setStatusFilter(f.filterData.status || '');
    setSearchInput(searchVal);
    setDebouncedSearch(searchVal);
    setShowSavedFilters(false);
    setSuccessMessage(`Saved filter "${f.name}" applied.`);
    setTimeout(() => setSuccessMessage(null), 3500);
  };

  const handleDeleteSavedFilter = async (id: string, name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await deleteSavedFilter(id);
      setSavedFilters((prev) => prev.filter((f) => f.id !== id));
      setSuccessMessage(`Filter preset "${name}" deleted.`);
      setTimeout(() => setSuccessMessage(null), 3500);
    } catch (err: any) {
      setError(err?.message || 'Failed to delete saved filter.');
    }
  };

  // ── EXPORT ───────────────────────────────────────────────────────────────────
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async (format: 'excel' | 'pdf') => {
    const ids = selectedArray.length > 0 ? selectedArray : undefined;
    setIsExporting(true);
    setError(null);
    try {
      if (format === 'excel') {
        await downloadExportExcel(ids);
      } else {
        await downloadExportPdf(ids);
      }
    } catch (err: any) {
      setError(err?.message || `Failed to export ${format.toUpperCase()}`);
    } finally {
      setIsExporting(false);
    }
  };

  const hasFilters = !!(searchInput || positionFilter || stageFilter || statusFilter);

  return (
    <div className="page-container hr-applications-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Candidate Applications</h1>
          <p className="page-subtitle">Review, evaluate, advance, and assign candidates through hiring pipelines.</p>
        </div>
        <div className="page-actions">
          <button className="btn btn-sm btn-secondary" onClick={() => handleExport('excel')} title="Export to Excel">
            📊 {selectedCount > 0 ? `Export ${selectedCount} to Excel` : 'Export Excel'}
          </button>
          <button className="btn btn-sm btn-secondary" onClick={() => handleExport('pdf')} title="Export to PDF">
            📄 {selectedCount > 0 ? `Export ${selectedCount} to PDF` : 'Export PDF'}
          </button>
        </div>
      </div>

      {error && <div className="page-alert page-alert--error">{error}</div>}
      {successMessage && (
        <div
          className="page-alert page-alert--success"
          style={{
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            color: '#34d399',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            padding: '10px 16px',
            borderRadius: '8px',
            marginBottom: '16px',
            fontSize: '0.875rem',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <span>✓</span>
          <span>{successMessage}</span>
        </div>
      )}

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

        {/* Saved Filters Dropdown */}
        <div className="filter-group" ref={savedFilterRef} style={{ position: 'relative' }}>
          <button
            className="btn btn-sm btn-secondary"
            onClick={() => setShowSavedFilters((prev) => !prev)}
            title="Saved filter presets"
          >
            🔖 Saved Filters {savedFilters.length > 0 && `(${savedFilters.length})`}
          </button>
          {showSavedFilters && (
            <div className="saved-filters-dropdown" style={{
              position: 'absolute',
              top: '110%',
              left: 0,
              zIndex: 100,
              background: 'var(--surface-card, #1e293b)',
              border: '1px solid var(--border-subtle, rgba(255,255,255,0.1))',
              borderRadius: '10px',
              padding: '12px',
              minWidth: '260px',
              boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
            }}>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '8px', fontWeight: 600 }}>SAVED PRESETS</p>
              {savedFilters.length === 0 ? (
                <p style={{ fontSize: '0.8rem', color: 'var(--text-subtle)', marginBottom: '10px' }}>No saved filters yet.</p>
              ) : (
                <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 10px 0' }}>
                  {savedFilters.map((f) => (
                    <li
                      key={f.id}
                      onClick={() => handleApplySavedFilter(f)}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '7px 10px',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '0.85rem',
                        color: 'var(--text-main)',
                        transition: 'background 0.15s',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      <span>📌 {f.name}</span>
                      <button
                        onClick={(e) => handleDeleteSavedFilter(f.id, f.name, e)}
                        title={`Delete filter "${f.name}"`}
                        style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', fontSize: '0.85rem', padding: '0 4px' }}
                      >✕</button>
                    </li>
                  ))}
                </ul>
              )}
              {hasFilters && (
                <div style={{ padding: '6px 8px', marginBottom: '8px', borderRadius: '6px', background: 'rgba(99, 102, 241, 0.1)', border: '1px solid rgba(99, 102, 241, 0.2)', fontSize: '0.75rem', color: 'var(--accent-indigo, #818cf8)' }}>
                  <span>Active filters to save: </span>
                  <strong>
                    {[
                      positionFilter ? `Position` : '',
                      stageFilter ? `Stage` : '',
                      statusFilter ? `Status (${statusFilter})` : '',
                      searchInput ? `Search ("${searchInput}")` : '',
                    ].filter(Boolean).join(', ') || 'All'}
                  </strong>
                </div>
              )}
              <div style={{ display: 'flex', gap: '6px' }}>
                <input
                  type="text"
                  className="form-input"
                  placeholder="New preset name..."
                  value={saveFilterName}
                  onChange={(e) => setSaveFilterName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleSaveFilter(); }}
                  style={{ fontSize: '0.8rem', padding: '6px 10px', flex: 1 }}
                />
                <button
                  className="btn btn-sm btn-primary"
                  onClick={handleSaveFilter}
                  disabled={!saveFilterName.trim() || isSavingFilter}
                  style={{ fontSize: '0.8rem' }}
                >
                  {isSavingFilter ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          )}
        </div>

        {hasFilters && (
          <>
            <button
              className="btn btn-sm btn-secondary"
              onClick={() => {
                setShowSavedFilters(true);
              }}
              title="Save the current active filters as a preset"
              style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              <span>💾</span>
              <span>Save Current</span>
            </button>
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
          </>
        )}
      </div>

      {/* Bulk Action Toolbar — shown when rows are selected */}
      {selectedCount > 0 && (
        <div className="bulk-action-toolbar" style={{
          background: 'var(--primary-dim, rgba(99,102,241,0.12))',
          border: '1px solid var(--primary, #6366f1)',
          borderRadius: '10px',
          padding: '12px 16px',
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '10px',
        }}>
          <span style={{ fontWeight: 700, color: 'var(--primary)', fontSize: '0.9rem' }}>
            ✓ {selectedCount} selected
          </span>
          <button className="btn btn-sm btn-outline-primary" onClick={() => setBulkAction('status')} disabled={isBulkLoading}>
            🔄 Change Status
          </button>
          <button className="btn btn-sm btn-outline-primary" onClick={() => setBulkAction('stage')} disabled={isBulkLoading}>
            ⏩ Change Stage
          </button>
          <button className="btn btn-sm btn-outline-primary" onClick={() => setBulkAction('team')} disabled={isBulkLoading}>
            🏢 Assign Team
          </button>
          <button className="btn btn-sm btn-secondary" onClick={() => setSelectedIds(new Set())} style={{ marginLeft: 'auto' }}>
            Clear
          </button>
        </div>
      )}

      {/* Bulk Action Form — status */}
      {bulkAction === 'status' && (
        <div className="bulk-action-form content-card" style={{ marginBottom: '16px' }}>
          <h4 style={{ marginBottom: '10px', fontSize: '0.95rem' }}>Bulk Status Change — {selectedCount} applications</h4>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div>
              <label className="form-label">New Status</label>
              <select className="form-select" value={bulkStatusValue} onChange={(e) => setBulkStatusValue(e.target.value as ApplicationStatus)}>
                <option value="InProgress">In Progress</option>
                <option value="OnHold">On Hold</option>
                <option value="Rejected">Rejected</option>
                <option value="Hired">Hired</option>
              </select>
            </div>
            <div style={{ flex: 1, minWidth: '180px' }}>
              <label className="form-label">Reason (optional)</label>
              <input className="form-input" value={bulkStatusReason} onChange={(e) => setBulkStatusReason(e.target.value)} placeholder="Optional reason..." />
            </div>
            <button className="btn btn-primary" onClick={handleBulkStatusChange} disabled={isBulkLoading}>
              {isBulkLoading ? 'Applying...' : 'Apply'}
            </button>
            <button className="btn btn-secondary" onClick={() => setBulkAction(null)} disabled={isBulkLoading}>Cancel</button>
          </div>
        </div>
      )}

      {/* Bulk Action Form — stage */}
      {bulkAction === 'stage' && (
        <div className="bulk-action-form content-card" style={{ marginBottom: '16px' }}>
          <h4 style={{ marginBottom: '10px', fontSize: '0.95rem' }}>Bulk Stage Progression — {selectedCount} applications</h4>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div>
              <label className="form-label">Target Stage (from current position)</label>
              <select className="form-select" value={bulkStageValue} onChange={(e) => setBulkStageValue(e.target.value)}>
                <option value="">Select stage...</option>
                {stages.length > 0
                  ? stages.map((s) => <option key={s.id} value={s.id}>Stage {s.sequenceOrder}: {s.name}</option>)
                  : allStages.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)
                }
              </select>
            </div>
            <button className="btn btn-primary" onClick={handleBulkStageChange} disabled={isBulkLoading || !bulkStageValue}>
              {isBulkLoading ? 'Applying...' : 'Apply'}
            </button>
            <button className="btn btn-secondary" onClick={() => setBulkAction(null)} disabled={isBulkLoading}>Cancel</button>
          </div>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '8px' }}>
            ⚠ Gated stages will block advancement for candidates missing required feedback. Per-application results will be shown.
          </p>
        </div>
      )}

      {/* Bulk Action Form — team */}
      {bulkAction === 'team' && (
        <div className="bulk-action-form content-card" style={{ marginBottom: '16px' }}>
          <h4 style={{ marginBottom: '10px', fontSize: '0.95rem' }}>Bulk Team Assignment — {selectedCount} applications</h4>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div>
              <label className="form-label">Assign to Team</label>
              <select className="form-select" value={bulkTeamValue} onChange={(e) => setBulkTeamValue(e.target.value)}>
                <option value="">Unassign (remove team)</option>
                {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <button className="btn btn-primary" onClick={handleBulkTeamAssign} disabled={isBulkLoading}>
              {isBulkLoading ? 'Applying...' : 'Apply'}
            </button>
            <button className="btn btn-secondary" onClick={() => setBulkAction(null)} disabled={isBulkLoading}>Cancel</button>
          </div>
        </div>
      )}

      {/* Bulk Results */}
      {bulkResults && bulkResults.length > 0 && (
        <div className="content-card" style={{ marginBottom: '16px', padding: '16px' }}>
          <h4 style={{ marginBottom: '10px', fontSize: '0.9rem' }}>Bulk Operation Results</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '200px', overflowY: 'auto' }}>
            {bulkResults.map((r) => (
              <div key={r.applicationId} style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 10px',
                borderRadius: '6px',
                background: r.success ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)',
                fontSize: '0.82rem',
                color: r.success ? '#34d399' : '#f87171',
              }}>
                <span>{r.success ? '✓' : '✗'}</span>
                <span style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: 'var(--text-subtle)' }}>{r.applicationId.slice(0, 8)}...</span>
                <span>{r.reason || r.message || r.error || (r.success ? 'Success' : 'Failed')}</span>
              </div>
            ))}
          </div>
        </div>
      )}

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
                  <th style={{ width: '40px' }}>
                    <input
                      type="checkbox"
                      checked={selectedIds.size === applications.length && applications.length > 0}
                      ref={(el) => {
                        if (el) el.indeterminate = selectedIds.size > 0 && selectedIds.size < applications.length;
                      }}
                      onChange={toggleSelectAll}
                      style={{ cursor: 'pointer', accentColor: 'var(--primary)' }}
                      title="Select all"
                    />
                  </th>
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
                  <tr key={app.id} style={{ background: selectedIds.has(app.id) ? 'rgba(99,102,241,0.06)' : undefined }}>
                    <td>
                      <input
                        type="checkbox"
                        checked={selectedIds.has(app.id)}
                        onChange={() => toggleSelect(app.id)}
                        style={{ cursor: 'pointer', accentColor: 'var(--primary)' }}
                      />
                    </td>
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
            {selectedCount > 0 && <span style={{ marginLeft: '12px', color: 'var(--primary)', fontWeight: 600 }}>({selectedCount} selected)</span>}
          </div>
        </div>
      )}
    </div>
  );
};

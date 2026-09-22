import React, { useState, useEffect, useCallback } from 'react';
import {
  getAuditLogsApi,
  AuditLogEntry,
  AuditLogMeta,
  AuditLogFilters,
} from '../../api/auditLog.api';
import {
  Activity,
  RefreshCw,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  X,
  Clock,
  Monitor,
  User as UserIcon,
  LogIn,
  LogOut,
  AlertCircle,
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// Action type badge config
// ─────────────────────────────────────────────────────────────────────────────
const ACTION_TYPE_META: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  AUTH_LOGIN_SUCCESS:       { label: 'Login',            color: 'var(--accent-emerald)', icon: <LogIn size={13} /> },
  AUTH_LOGIN_FAILED:        { label: 'Login Failed',     color: '#f87171',              icon: <AlertCircle size={13} /> },
  AUTH_LOGOUT:              { label: 'Logout',           color: 'var(--text-muted)',    icon: <LogOut size={13} /> },
};

const getActionMeta = (actionType: string) =>
  ACTION_TYPE_META[actionType] ?? { label: actionType, color: 'var(--text-subtle)', icon: <Activity size={13} /> };

// ─────────────────────────────────────────────────────────────────────────────
// Formatters
// ─────────────────────────────────────────────────────────────────────────────
const formatDateTime = (iso: string): { date: string; time: string } => {
  const d = new Date(iso);
  return {
    date: d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }),
    time: d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
  };
};

const truncateUA = (ua: string | null, max = 60): string => {
  if (!ua) return '—';
  return ua.length > max ? ua.slice(0, max) + '…' : ua;
};

const parseDetails = (raw: string | null): string => {
  if (!raw) return '—';
  try {
    const obj = JSON.parse(raw);
    return Object.entries(obj)
      .map(([k, v]) => `${k}: ${v}`)
      .join(' · ');
  } catch {
    return raw;
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// All known action types for filter dropdown
// ─────────────────────────────────────────────────────────────────────────────
const ALL_ACTION_TYPES = Object.keys(ACTION_TYPE_META);

// ─────────────────────────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────────────────────────
export const ManagerAccessLogPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [meta, setMeta] = useState<AuditLogMeta>({ total: 0, page: 1, limit: 50, totalPages: 1 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [actionType, setActionType] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [page, setPage] = useState(1);
  const LIMIT = 50;

  // Expanded row
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchLogs = useCallback(async (filters: AuditLogFilters) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await getAuditLogsApi(filters);
      setLogs(result.data);
      setMeta(result.meta);
    } catch (err: any) {
      setError(err.message || 'Failed to load access logs.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLogs({ page, limit: LIMIT, search: search || undefined, actionType: actionType || undefined, from: fromDate || undefined, to: toDate || undefined });
  }, [page, fetchLogs]);

  const handleApplyFilters = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchLogs({ page: 1, limit: LIMIT, search: search || undefined, actionType: actionType || undefined, from: fromDate || undefined, to: toDate || undefined });
  };

  const handleClearFilters = () => {
    setSearch('');
    setActionType('');
    setFromDate('');
    setToDate('');
    setPage(1);
    fetchLogs({ page: 1, limit: LIMIT });
  };

  const hasActiveFilters = search || actionType || fromDate || toDate;

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-main)', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Activity color="var(--primary)" size={24} />
            Access &amp; Activity Log
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '5px', marginBottom: 0 }}>
            Full audit trail of all authentication and security events.
          </p>
        </div>
        <button
          onClick={() => fetchLogs({ page, limit: LIMIT, search: search || undefined, actionType: actionType || undefined, from: fromDate || undefined, to: toDate || undefined })}
          className="btn btn-secondary"
          disabled={isLoading}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}
        >
          <RefreshCw size={14} className={isLoading ? 'spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Filter Bar */}
      <div className="glass-card" style={{ padding: '18px 24px', marginBottom: '20px' }}>
        <form onSubmit={handleApplyFilters} style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          {/* Search */}
          <div style={{ flex: '1 1 200px' }}>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
              Search
            </label>
            <div style={{ position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
              <input
                id="access-log-search"
                type="text"
                className="input-field"
                style={{ paddingLeft: '32px', height: '36px', fontSize: '0.85rem' }}
                placeholder="IP, action, entity…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          {/* Action Type */}
          <div style={{ flex: '0 0 200px' }}>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
              <Filter size={12} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
              Event Type
            </label>
            <select
              id="access-log-action-type"
              className="input-field"
              style={{ height: '36px', fontSize: '0.85rem' }}
              value={actionType}
              onChange={(e) => setActionType(e.target.value)}
            >
              <option value="">All Events</option>
              {ALL_ACTION_TYPES.map((t) => (
                <option key={t} value={t}>{ACTION_TYPE_META[t].label} ({t})</option>
              ))}
            </select>
          </div>

          {/* From Date */}
          <div style={{ flex: '0 0 148px' }}>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
              From Date
            </label>
            <input
              id="access-log-from"
              type="date"
              className="input-field"
              style={{ height: '36px', fontSize: '0.85rem' }}
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
            />
          </div>

          {/* To Date */}
          <div style={{ flex: '0 0 148px' }}>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
              To Date
            </label>
            <input
              id="access-log-to"
              type="date"
              className="input-field"
              style={{ height: '36px', fontSize: '0.85rem' }}
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
            />
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: '8px', paddingBottom: '1px' }}>
            <button type="submit" className="btn btn-primary" style={{ height: '36px', padding: '0 16px', fontSize: '0.85rem' }}>
              Apply
            </button>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleClearFilters}
                className="btn btn-secondary"
                style={{ height: '36px', padding: '0 12px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '5px' }}
              >
                <X size={13} /> Clear
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Error */}
      {error && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', marginBottom: '16px', color: '#f87171' }}>
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* Table */}
      <div className="glass-card" style={{ padding: '0', overflow: 'hidden' }}>
        {/* Stats row */}
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
          <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
            {isLoading ? 'Loading…' : `${meta.total.toLocaleString()} event${meta.total !== 1 ? 's' : ''} found`}
          </span>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-subtle)' }}>
            Page {meta.page} of {meta.totalPages}
          </span>
        </div>

        {isLoading ? (
          <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <RefreshCw size={24} style={{ animation: 'spin 1s linear infinite', marginBottom: '12px' }} />
            <p style={{ margin: 0 }}>Loading access logs…</p>
          </div>
        ) : logs.length === 0 ? (
          <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text-subtle)' }}>
            <Activity size={32} style={{ marginBottom: '12px', opacity: 0.4 }} />
            <p style={{ margin: 0 }}>No events match your filters.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
              <thead>
                <tr style={{ backgroundColor: 'rgba(255,255,255,0.03)', borderBottom: '1px solid var(--border-subtle)', textAlign: 'left' }}>
                  <th style={{ padding: '11px 16px', color: 'var(--text-muted)', fontWeight: 600, whiteSpace: 'nowrap' }}>
                    <Clock size={13} style={{ verticalAlign: 'middle', marginRight: '4px' }} />Timestamp
                  </th>
                  <th style={{ padding: '11px 16px', color: 'var(--text-muted)', fontWeight: 600 }}>Event</th>
                  <th style={{ padding: '11px 16px', color: 'var(--text-muted)', fontWeight: 600 }}>
                    <UserIcon size={13} style={{ verticalAlign: 'middle', marginRight: '4px' }} />Actor
                  </th>
                  <th style={{ padding: '11px 16px', color: 'var(--text-muted)', fontWeight: 600 }}>
                    <Monitor size={13} style={{ verticalAlign: 'middle', marginRight: '4px' }} />IP Address
                  </th>
                  <th style={{ padding: '11px 16px', color: 'var(--text-muted)', fontWeight: 600 }}>Details</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => {
                  const { date, time } = formatDateTime(log.timestamp);
                  const actionMeta = getActionMeta(log.actionType);
                  const isExpanded = expandedId === log.id;

                  return (
                    <React.Fragment key={log.id}>
                      <tr
                        style={{
                          borderBottom: '1px solid rgba(255,255,255,0.03)',
                          cursor: 'pointer',
                          transition: 'background 0.1s',
                        }}
                        onClick={() => setExpandedId(isExpanded ? null : log.id)}
                        onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.025)')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                      >
                        {/* Timestamp */}
                        <td style={{ padding: '11px 16px', whiteSpace: 'nowrap', verticalAlign: 'top' }}>
                          <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{date}</div>
                          <div style={{ color: 'var(--text-subtle)', fontSize: '0.75rem' }}>{time}</div>
                        </td>

                        {/* Event */}
                        <td style={{ padding: '11px 16px', verticalAlign: 'top' }}>
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '5px',
                              padding: '3px 10px',
                              borderRadius: '999px',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              color: actionMeta.color,
                              background: `${actionMeta.color}18`,
                              border: `1px solid ${actionMeta.color}30`,
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {actionMeta.icon}
                            {actionMeta.label}
                          </span>
                        </td>

                        {/* Actor */}
                        <td style={{ padding: '11px 16px', verticalAlign: 'top' }}>
                          {log.actor ? (
                            <>
                              <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{log.actor.name}</div>
                              <div style={{ color: 'var(--text-subtle)', fontSize: '0.75rem' }}>{log.actor.email}</div>
                            </>
                          ) : log.actorId ? (
                            <span style={{ color: 'var(--text-subtle)', fontStyle: 'italic' }}>{log.actorId.slice(0, 8)}… (deleted)</span>
                          ) : (
                            <span style={{ color: 'var(--text-subtle)', fontStyle: 'italic' }}>Anonymous</span>
                          )}
                        </td>

                        {/* IP */}
                        <td style={{ padding: '11px 16px', verticalAlign: 'top', whiteSpace: 'nowrap' }}>
                          <code style={{ fontSize: '0.78rem', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.04)', padding: '2px 7px', borderRadius: '4px' }}>
                            {log.ipAddress || '—'}
                          </code>
                        </td>

                        {/* Details */}
                        <td style={{ padding: '11px 16px', verticalAlign: 'top', maxWidth: '280px' }}>
                          <span style={{ color: 'var(--text-muted)', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                            {parseDetails(log.details)}
                          </span>
                        </td>
                      </tr>

                      {/* Expanded row: full user agent + raw details */}
                      {isExpanded && (
                        <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', backgroundColor: 'rgba(99,102,241,0.04)' }}>
                          <td colSpan={5} style={{ padding: '12px 16px 16px 32px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.78rem' }}>
                              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', flexWrap: 'wrap' }}>
                                <div>
                                  <span style={{ color: 'var(--text-subtle)', fontWeight: 600, marginRight: '6px' }}>Entity:</span>
                                  <code style={{ color: 'var(--text-muted)', background: 'rgba(255,255,255,0.04)', padding: '1px 6px', borderRadius: '3px' }}>
                                    {log.entityType} / {log.entityId}
                                  </code>
                                </div>
                                {log.userAgent && (
                                  <div style={{ flex: 1 }}>
                                    <span style={{ color: 'var(--text-subtle)', fontWeight: 600, marginRight: '6px' }}>User-Agent:</span>
                                    <span style={{ color: 'var(--text-muted)' }}>{truncateUA(log.userAgent, 120)}</span>
                                  </div>
                                )}
                              </div>
                              {log.details && (
                                <div>
                                  <span style={{ color: 'var(--text-subtle)', fontWeight: 600, marginRight: '6px' }}>Raw Details:</span>
                                  <code style={{ color: 'var(--text-muted)', background: 'rgba(255,255,255,0.04)', padding: '2px 8px', borderRadius: '4px', wordBreak: 'break-all' }}>
                                    {log.details}
                                  </code>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {!isLoading && meta.totalPages > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', padding: '16px 20px', borderTop: '1px solid var(--border-subtle)' }}>
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={meta.page <= 1}
              className="btn btn-secondary"
              style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '6px 14px', fontSize: '0.82rem' }}
            >
              <ChevronLeft size={14} /> Prev
            </button>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              Page <strong style={{ color: 'var(--text-main)' }}>{meta.page}</strong> / {meta.totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
              disabled={meta.page >= meta.totalPages}
              className="btn btn-secondary"
              style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '6px 14px', fontSize: '0.82rem' }}
            >
              Next <ChevronRight size={14} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ManagerAccessLogPage;

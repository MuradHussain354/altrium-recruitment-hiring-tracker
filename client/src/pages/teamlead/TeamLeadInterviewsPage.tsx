import React, { useEffect, useState } from 'react';
import { teamLeadInterviewsApi } from '../../api/teamLeadInterviews.api';
import { TLInterviewListItem } from '../../types/teamlead';
import { Calendar, Filter, ChevronRight, AlertCircle, MapPin } from 'lucide-react';
import { Link } from 'react-router-dom';

export const TeamLeadInterviewsPage: React.FC = () => {
  const [interviews, setInterviews] = useState<TLInterviewListItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Confirmed backend filters
  const [statusFilter, setStatusFilter] = useState<'Scheduled' | 'Completed' | 'Cancelled' | ''>('');
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');

  const fetchInterviews = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const params: {
        status?: 'Scheduled' | 'Completed' | 'Cancelled' | '';
        from?: string;
        to?: string;
      } = {};

      if (statusFilter) params.status = statusFilter;
      if (fromDate) params.from = new Date(fromDate).toISOString();
      if (toDate) params.to = new Date(toDate).toISOString();

      const res = await teamLeadInterviewsApi.listMyInterviews(params);
      setInterviews(res.data);
      setIsLoading(false);
    } catch (err: any) {
      setError(err.message || 'Failed to load assigned interviews.');
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInterviews();
  }, [statusFilter, fromDate, toDate]);

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
            Assigned Interviews
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: '4px 0 0 0' }}>
            List of technical evaluations assigned to you by HR.
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="glass-card" style={{ padding: '18px 24px', marginBottom: '24px', display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '0.875rem', fontWeight: 600 }}>
          <Filter size={16} /> Filters:
        </div>

        <div style={{ minWidth: '160px' }}>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="input-field"
            style={{ width: '100%', fontSize: '0.85rem' }}
          >
            <option value="">All Statuses</option>
            <option value="Scheduled">Scheduled</option>
            <option value="Completed">Completed</option>
            <option value="Cancelled">Cancelled</option>
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>From:</span>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="input-field"
            style={{ fontSize: '0.85rem' }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>To:</span>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="input-field"
            style={{ fontSize: '0.85rem' }}
          />
        </div>

        {(statusFilter || fromDate || toDate) && (
          <button
            onClick={() => {
              setStatusFilter('');
              setFromDate('');
              setToDate('');
            }}
            className="btn btn-secondary"
            style={{ fontSize: '0.8rem', padding: '6px 12px' }}
          >
            Clear Filters
          </button>
        )}
      </div>

      {error && (
        <div style={{
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          borderRadius: '8px',
          padding: '12px 16px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          color: '#f87171'
        }}>
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Interviews Table / Cards */}
      <div className="glass-card" style={{ padding: '0', overflow: 'hidden' }}>
        {isLoading ? (
          <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
            Loading assigned interviews...
          </div>
        ) : interviews.length === 0 ? (
          <div style={{ padding: '48px 24px', textAlign: 'center' }}>
            <Calendar size={36} color="var(--text-subtle)" style={{ marginBottom: '12px', opacity: 0.5 }} />
            <h4 style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '4px' }}>
              No Assigned Interviews Found
            </h4>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>
              {statusFilter || fromDate || toDate ? 'Try clearing your search filters.' : 'You have no interview assignments matching criteria.'}
            </p>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ backgroundColor: 'rgba(255, 255, 255, 0.03)', borderBottom: '1px solid var(--border-subtle)', textAlign: 'left' }}>
                <th style={{ padding: '14px 20px', color: 'var(--text-muted)', fontWeight: 600 }}>Candidate</th>
                <th style={{ padding: '14px 20px', color: 'var(--text-muted)', fontWeight: 600 }}>Position & Department</th>
                <th style={{ padding: '14px 20px', color: 'var(--text-muted)', fontWeight: 600 }}>Stage</th>
                <th style={{ padding: '14px 20px', color: 'var(--text-muted)', fontWeight: 600 }}>Schedule & Location</th>
                <th style={{ padding: '14px 20px', color: 'var(--text-muted)', fontWeight: 600 }}>Status</th>
                <th style={{ padding: '14px 20px', color: 'var(--text-muted)', fontWeight: 600, textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {interviews.map((item) => {
                const formattedDate = item.scheduledAt
                  ? new Date(item.scheduledAt).toLocaleString(undefined, {
                      dateStyle: 'medium',
                      timeStyle: 'short'
                    })
                  : 'Not scheduled';

                const badgeClass =
                  item.status === 'Completed'
                    ? 'badge-emerald'
                    : item.status === 'Cancelled'
                    ? 'badge-amber'
                    : 'badge-cyan';

                return (
                  <tr key={item.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.03)' }}>
                    <td style={{ padding: '14px 20px', fontWeight: 600, color: 'var(--text-main)' }}>
                      {item.application.candidate.name}
                    </td>
                    <td style={{ padding: '14px 20px', color: 'var(--text-main)' }}>
                      <div>{item.application.position.title}</div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-subtle)' }}>{item.application.position.department}</div>
                    </td>
                    <td style={{ padding: '14px 20px', color: 'var(--text-muted)' }}>
                      {item.stage.name}
                    </td>
                    <td style={{ padding: '14px 20px', color: 'var(--text-main)' }}>
                      <div>{formattedDate}</div>
                      {item.location && (
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-subtle)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <MapPin size={12} /> {item.location}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '14px 20px' }}>
                      <span className={`badge ${badgeClass}`}>
                        {item.status}
                      </span>
                    </td>
                    <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                      <Link
                        to={`/team-lead/interviews/${item.id}`}
                        className="btn btn-secondary"
                        style={{ fontSize: '0.8rem', padding: '6px 12px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                      >
                        Inspect <ChevronRight size={14} />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default TeamLeadInterviewsPage;

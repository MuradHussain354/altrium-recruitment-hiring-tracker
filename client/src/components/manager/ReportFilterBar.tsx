import React, { useState } from 'react';
import { ReportFilters } from '../../types/manager';
import { Filter, X } from 'lucide-react';

interface ReportFilterBarProps {
  onApplyFilters: (filters: ReportFilters) => void;
  isLoading?: boolean;
}

export const ReportFilterBar: React.FC<ReportFilterBarProps> = ({ onApplyFilters, isLoading }) => {
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [department, setDepartment] = useState<string>('');
  const [positionId, setPositionId] = useState<string>('');

  const handleApply = (e: React.FormEvent) => {
    e.preventDefault();
    const filters: ReportFilters = {};

    if (dateFrom) filters.dateFrom = new Date(dateFrom).toISOString();
    if (dateTo) filters.dateTo = new Date(dateTo).toISOString();
    if (department.trim()) filters.department = department.trim();
    if (positionId.trim()) filters.positionId = positionId.trim();

    onApplyFilters(filters);
  };

  const handleClear = () => {
    setDateFrom('');
    setDateTo('');
    setDepartment('');
    setPositionId('');
    onApplyFilters({});
  };

  const hasActiveFilters = Boolean(dateFrom || dateTo || department || positionId);

  return (
    <form
      onSubmit={handleApply}
      className="glass-card"
      style={{
        padding: '18px 24px',
        marginBottom: '24px',
        display: 'flex',
        flexWrap: 'wrap',
        gap: '16px',
        alignItems: 'center'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '0.875rem', fontWeight: 600 }}>
        <Filter size={16} /> Report Filters:
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>From:</span>
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          className="input-field"
          style={{ fontSize: '0.85rem' }}
        />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>To:</span>
        <input
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          className="input-field"
          style={{ fontSize: '0.85rem' }}
        />
      </div>

      <div style={{ minWidth: '160px' }}>
        <input
          type="text"
          placeholder="Department (e.g. Engineering)"
          value={department}
          onChange={(e) => setDepartment(e.target.value)}
          className="input-field"
          style={{ width: '100%', fontSize: '0.85rem' }}
        />
      </div>

      <div style={{ minWidth: '220px' }}>
        <input
          type="text"
          placeholder="Position UUID (optional)"
          value={positionId}
          onChange={(e) => setPositionId(e.target.value)}
          className="input-field"
          style={{ width: '100%', fontSize: '0.85rem' }}
        />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <button
          type="submit"
          className="btn btn-primary"
          disabled={isLoading}
          style={{ fontSize: '0.85rem', padding: '6px 14px' }}
        >
          Apply Filters
        </button>

        {hasActiveFilters && (
          <button
            type="button"
            onClick={handleClear}
            className="btn btn-secondary"
            disabled={isLoading}
            style={{ fontSize: '0.85rem', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '4px' }}
          >
            <X size={14} /> Clear
          </button>
        )}
      </div>
    </form>
  );
};

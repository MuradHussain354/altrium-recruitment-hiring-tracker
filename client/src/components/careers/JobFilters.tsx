import React from 'react';
import { Search, Building2, X } from 'lucide-react';
import { PublicPositionFilters } from '../../types/careers';

interface JobFiltersProps {
  filters: PublicPositionFilters;
  onChange: (updated: PublicPositionFilters) => void;
  isLoading: boolean;
}

export const JobFilters: React.FC<JobFiltersProps> = ({ filters, onChange, isLoading }) => {
  const hasActiveFilters = Boolean(
    (filters.search && filters.search.trim()) ||
    (filters.department && filters.department.trim())
  );

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({ ...filters, search: e.target.value });
  };

  const handleDepartmentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({ ...filters, department: e.target.value });
  };

  const handleClear = () => {
    onChange({ search: '', department: '' });
  };

  return (
    <div className="job-filters" role="search" aria-label="Filter job openings">
      <div className="job-filters__fields">
        {/* Search Input */}
        <div className="job-filters__field">
          <div className="input-icon-wrapper">
            <Search size={16} className="input-icon" aria-hidden="true" />
            <input
              id="jobs-search-input"
              type="text"
              className="input-field input-field--icon-left"
              placeholder="Search by title, skills, or description..."
              value={filters.search ?? ''}
              onChange={handleSearchChange}
              disabled={isLoading}
              aria-label="Search positions"
              autoComplete="off"
            />
          </div>
        </div>

        {/* Department Filter */}
        <div className="job-filters__field">
          <div className="input-icon-wrapper">
            <Building2 size={16} className="input-icon" aria-hidden="true" />
            <input
              id="jobs-department-input"
              type="text"
              className="input-field input-field--icon-left"
              placeholder="Filter by department..."
              value={filters.department ?? ''}
              onChange={handleDepartmentChange}
              disabled={isLoading}
              aria-label="Filter by department"
              autoComplete="off"
            />
          </div>
        </div>
      </div>

      {/* Clear Filters */}
      {hasActiveFilters && (
        <button
          id="jobs-clear-filters"
          type="button"
          className="btn-ghost job-filters__clear"
          onClick={handleClear}
          disabled={isLoading}
          aria-label="Clear all filters"
        >
          <X size={14} />
          Clear filters
        </button>
      )}
    </div>
  );
};

export default JobFilters;

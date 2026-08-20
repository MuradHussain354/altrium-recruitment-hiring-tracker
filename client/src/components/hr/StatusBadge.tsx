import React from 'react';
import { PositionStatus, ApplicationStatus, InterviewStatus } from '../../types/hr';

interface StatusBadgeProps {
  status: PositionStatus | ApplicationStatus | InterviewStatus | string;
  type?: 'position' | 'application' | 'interview' | 'gating' | 'role';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, type = 'application' }) => {
  const getBadgeClass = (): string => {
    switch (status) {
      // Application & General
      case 'InProgress':
        return 'badge--in-progress';
      case 'Hired':
        return 'badge--hired';
      case 'Rejected':
        return 'badge--rejected';
      case 'OnHold':
        return 'badge--on-hold';

      // Position
      case 'Draft':
        return 'badge--draft';
      case 'Open':
        return 'badge--open';
      case 'Closed':
        return 'badge--closed';

      // Interview
      case 'Scheduled':
        return 'badge--scheduled';
      case 'Completed':
        return 'badge--completed';
      case 'Cancelled':
        return 'badge--cancelled';

      default:
        return 'badge--default';
    }
  };

  const getLabel = (): string => {
    switch (status) {
      case 'InProgress':
        return 'In Progress';
      case 'OnHold':
        return 'On Hold';
      default:
        return status;
    }
  };

  return (
    <span className={`status-badge ${getBadgeClass()} status-badge--${type}`}>
      {getLabel()}
    </span>
  );
};

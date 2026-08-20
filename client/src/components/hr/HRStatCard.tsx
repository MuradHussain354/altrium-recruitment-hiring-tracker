import React from 'react';

interface HRStatCardProps {
  title: string;
  value: number | string;
  subtitle?: string;
  icon?: string;
  colorVariant?: 'primary' | 'success' | 'warning' | 'info' | 'purple';
}

export const HRStatCard: React.FC<HRStatCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  colorVariant = 'primary'
}) => {
  return (
    <div className={`hr-stat-card hr-stat-card--${colorVariant}`}>
      <div className="hr-stat-card__header">
        <span className="hr-stat-card__title">{title}</span>
        {icon && <span className="hr-stat-card__icon">{icon}</span>}
      </div>
      <div className="hr-stat-card__value">{value}</div>
      {subtitle && <div className="hr-stat-card__subtitle">{subtitle}</div>}
    </div>
  );
};

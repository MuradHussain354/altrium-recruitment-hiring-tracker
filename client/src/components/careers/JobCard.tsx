import React from 'react';
import { Link } from 'react-router-dom';
import { Building2, Users, ArrowRight, Clock } from 'lucide-react';
import { PublicPosition } from '../../types/careers';

interface JobCardProps {
  position: PublicPosition;
}

function formatRelativeDate(isoDate: string): string {
  const posted = new Date(isoDate);
  const now = new Date();
  const diffMs = now.getTime() - posted.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Posted today';
  if (diffDays === 1) return 'Posted yesterday';
  if (diffDays < 30) return `Posted ${diffDays} days ago`;
  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths === 1) return 'Posted 1 month ago';
  return `Posted ${diffMonths} months ago`;
}

function truncateSkills(skills: string | null, maxLength = 80): string | null {
  if (!skills) return null;
  const trimmed = skills.trim();
  if (trimmed.length <= maxLength) return trimmed;
  return trimmed.slice(0, maxLength).replace(/[,\s]+$/, '') + '...';
}

export const JobCard: React.FC<JobCardProps> = ({ position }) => {
  const skillsPreview = truncateSkills(position.requiredSkills);

  return (
    <article className="job-card glass-card" aria-label={`Job: ${position.title}`}>
      <div className="job-card__header">
        <div className="job-card__meta">
          <span className="badge badge-indigo">
            <Building2 size={11} />
            {position.department}
          </span>
          <span className="job-card__headcount">
            <Users size={13} />
            {position.headcount} {position.headcount === 1 ? 'Opening' : 'Openings'}
          </span>
        </div>
        <h2 className="job-card__title">{position.title}</h2>
      </div>

      {skillsPreview && (
        <div className="job-card__skills">
          <p className="job-card__skills-text">{skillsPreview}</p>
        </div>
      )}

      <div className="job-card__footer">
        <span className="job-card__date">
          <Clock size={13} />
          {formatRelativeDate(position.createdAt)}
        </span>
        <Link
          to={`/careers/${position.id}`}
          className="job-card__cta btn-primary"
          id={`job-card-view-${position.id}`}
          aria-label={`View details for ${position.title}`}
        >
          View Details
          <ArrowRight size={15} />
        </Link>
      </div>
    </article>
  );
};

export default JobCard;

import React from 'react';
import { TLFeedbackItem } from '../../types/teamlead';
import { CheckCircle2, MessageSquare, Award } from 'lucide-react';

interface OwnFeedbackViewProps {
  feedback: TLFeedbackItem;
}

export const OwnFeedbackView: React.FC<OwnFeedbackViewProps> = ({ feedback }) => {
  const formattedDate = new Date(feedback.submittedAt).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short'
  });

  return (
    <div className="glass-card" style={{ padding: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '8px',
            backgroundColor: 'rgba(16, 185, 129, 0.15)',
            color: 'var(--accent-emerald)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <CheckCircle2 size={20} />
          </div>
          <div>
            <h4 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, color: 'var(--text-main)' }}>
              Your Evaluation Submitted
            </h4>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Submitted on {formattedDate}
            </span>
          </div>
        </div>

        {feedback.overallRating !== null && feedback.overallRating !== undefined && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: 'rgba(99, 102, 241, 0.15)',
            border: '1px solid rgba(99, 102, 241, 0.3)',
            padding: '8px 16px',
            borderRadius: '20px',
            color: 'var(--primary-light)',
            fontWeight: 700,
            fontSize: '1rem'
          }}>
            <Award size={18} />
            <span>Overall Rating: {feedback.overallRating}</span>
          </div>
        )}
      </div>

      {/* Qualitative Comments */}
      {feedback.comments && (
        <div style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '8px' }}>
            <MessageSquare size={16} /> Evaluation Comments
          </div>
          <div style={{
            padding: '14px 16px',
            backgroundColor: 'rgba(255, 255, 255, 0.02)',
            borderRadius: '8px',
            border: '1px solid var(--border-subtle)',
            fontSize: '0.9rem',
            color: 'var(--text-main)',
            lineHeight: 1.5,
            whiteSpace: 'pre-wrap'
          }}>
            {feedback.comments}
          </div>
        </div>
      )}

      {/* Criterion Scores */}
      {feedback.criterionScores && feedback.criterionScores.length > 0 && (
        <div>
          <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '10px' }}>
            Technical Criterion Breakdown
          </div>
          <div style={{
            borderRadius: '8px',
            border: '1px solid var(--border-subtle)',
            overflow: 'hidden'
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ backgroundColor: 'rgba(255, 255, 255, 0.03)', borderBottom: '1px solid var(--border-subtle)', textAlign: 'left' }}>
                  <th style={{ padding: '10px 14px', color: 'var(--text-muted)', fontWeight: 600 }}>Criterion Name</th>
                  <th style={{ padding: '10px 14px', color: 'var(--text-muted)', fontWeight: 600 }}>Weight</th>
                  <th style={{ padding: '10px 14px', color: 'var(--text-muted)', fontWeight: 600, textAlign: 'right' }}>Score</th>
                </tr>
              </thead>
              <tbody>
                {feedback.criterionScores.map((c) => (
                  <tr key={c.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.03)' }}>
                    <td style={{ padding: '10px 14px', color: 'var(--text-main)', fontWeight: 500 }}>{c.criterionName}</td>
                    <td style={{ padding: '10px 14px', color: 'var(--text-muted)' }}>{c.weight}</td>
                    <td style={{ padding: '10px 14px', color: 'var(--accent-emerald)', fontWeight: 700, textAlign: 'right' }}>{c.score}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useState } from 'react';
import { teamLeadFeedbackApi } from '../../api/teamLeadFeedback.api';
import { FeedbackCriterionInput } from '../../types/teamlead';
import { X, Plus, Trash2, AlertCircle } from 'lucide-react';

interface FeedbackSubmitModalProps {
  interviewId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const FeedbackSubmitModal: React.FC<FeedbackSubmitModalProps> = ({
  interviewId,
  isOpen,
  onClose,
  onSuccess
}) => {
  const [overallRating, setOverallRating] = useState<string>('');
  const [comments, setComments] = useState<string>('');
  const [criteria, setCriteria] = useState<FeedbackCriterionInput[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleAddCriterion = () => {
    setCriteria([...criteria, { criterionName: '', weight: 1.0, score: 0 }]);
  };

  const handleRemoveCriterion = (index: number) => {
    setCriteria(criteria.filter((_, i) => i !== index));
  };

  const handleCriterionChange = (index: number, field: keyof FeedbackCriterionInput, value: any) => {
    const updated = [...criteria];
    updated[index] = { ...updated[index], [field]: value };
    setCriteria(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const payload: {
        overallRating?: number;
        comments?: string;
        criterionScores?: FeedbackCriterionInput[];
      } = {};

      if (overallRating.trim() !== '') {
        const ratingVal = parseFloat(overallRating);
        if (isNaN(ratingVal) || ratingVal < 0 || ratingVal > 99.9) {
          setError('Overall rating must be a valid number between 0 and 99.9');
          setIsSubmitting(false);
          return;
        }
        payload.overallRating = ratingVal;
      }

      if (comments.trim()) {
        payload.comments = comments.trim();
      }

      if (criteria.length > 0) {
        for (let i = 0; i < criteria.length; i++) {
          const c = criteria[i];
          if (!c.criterionName.trim()) {
            setError(`Criterion #${i + 1} name cannot be empty.`);
            setIsSubmitting(false);
            return;
          }
          if (c.score < 0 || c.score > 99.99) {
            setError(`Criterion #${i + 1} score must be between 0 and 99.99.`);
            setIsSubmitting(false);
            return;
          }
        }
        payload.criterionScores = criteria.map((c) => ({
          criterionName: c.criterionName.trim(),
          weight: c.weight !== undefined ? Number(c.weight) : 1.0,
          score: Number(c.score)
        }));
      }

      await teamLeadFeedbackApi.submitFeedback(interviewId, payload);
      setIsSubmitting(false);
      onSuccess();
      onClose();
    } catch (err: any) {
      setIsSubmitting(false);
      if (err.error === 'ConflictError' || err.message?.includes('already been submitted')) {
        setError('Feedback has already been submitted for this interview.');
      } else {
        setError(err.message || 'Failed to submit feedback. Please try again.');
      }
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.75)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px'
    }}>
      <div className="glass-card" style={{
        width: '100%',
        maxWidth: '620px',
        maxHeight: '90vh',
        overflowY: 'auto',
        padding: '28px',
        position: 'relative'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: 'var(--text-main)' }}>
              Submit Interview Evaluation
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
              Provide overall rating, qualitative comments, and technical criterion scores.
            </p>
          </div>
          <button
            onClick={onClose}
            className="btn btn-secondary"
            style={{ padding: '6px', borderRadius: '8px', cursor: 'pointer' }}
          >
            <X size={18} />
          </button>
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
            color: '#f87171',
            fontSize: '0.875rem'
          }}>
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '18px' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '6px' }}>
              Overall Rating (Optional)
            </label>
            <input
              type="number"
              step="0.1"
              min="0"
              max="99.9"
              placeholder="e.g. 4.5 or 85"
              value={overallRating}
              onChange={(e) => setOverallRating(e.target.value)}
              className="input-field"
              style={{ width: '100%' }}
            />
            <span style={{ fontSize: '0.75rem', color: 'var(--text-subtle)', marginTop: '4px', display: 'block' }}>
              Enter numeric score (0 to 99.9). Displayed neutrally without fixed scale.
            </span>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '6px' }}>
              Qualitative Evaluation Comments (Optional)
            </label>
            <textarea
              rows={4}
              placeholder="Enter technical interview feedback, candidate strengths, code quality observations, or concerns..."
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              className="input-field"
              style={{ width: '100%', resize: 'vertical' }}
            />
          </div>

          <div style={{ marginBottom: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)', margin: 0 }}>
                Criterion Scores (Optional)
              </label>
              <button
                type="button"
                onClick={handleAddCriterion}
                className="btn btn-secondary"
                style={{ fontSize: '0.8rem', padding: '4px 10px', display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                <Plus size={14} /> Add Criterion
              </button>
            </div>

            {criteria.length === 0 ? (
              <div style={{
                padding: '16px',
                borderRadius: '8px',
                border: '1px dashed var(--border-subtle)',
                textAlign: 'center',
                color: 'var(--text-subtle)',
                fontSize: '0.85rem'
              }}>
                No individual criterion scores added. Click "Add Criterion" to score specific skills (e.g., System Design, Coding, Problem Solving).
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {criteria.map((c, idx) => (
                  <div key={idx} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '10px 12px',
                    backgroundColor: 'rgba(255, 255, 255, 0.03)',
                    borderRadius: '8px',
                    border: '1px solid var(--border-subtle)'
                  }}>
                    <input
                      type="text"
                      placeholder="Criterion Name (e.g. React/TypeScript)"
                      value={c.criterionName}
                      onChange={(e) => handleCriterionChange(idx, 'criterionName', e.target.value)}
                      className="input-field"
                      style={{ flex: 2, fontSize: '0.85rem' }}
                    />
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="99.99"
                      placeholder="Score"
                      value={c.score}
                      onChange={(e) => handleCriterionChange(idx, 'score', parseFloat(e.target.value) || 0)}
                      className="input-field"
                      style={{ width: '80px', fontSize: '0.85rem' }}
                    />
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="99.99"
                      placeholder="Weight"
                      value={c.weight}
                      onChange={(e) => handleCriterionChange(idx, 'weight', parseFloat(e.target.value) || 1.0)}
                      className="input-field"
                      style={{ width: '80px', fontSize: '0.85rem' }}
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveCriterion(idx)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--accent-amber)',
                        cursor: 'pointer',
                        padding: '4px'
                      }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Submitting...' : 'Submit Evaluation'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

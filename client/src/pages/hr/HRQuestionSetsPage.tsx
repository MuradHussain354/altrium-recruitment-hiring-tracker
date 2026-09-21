import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  getQuestionSets,
  getQuestionSetById,
  createQuestionSet,
  updateQuestionSet,
  duplicateQuestionSet,
  deleteQuestionSet,
} from '../../api/batch2.api';
import { QuestionSet, Question } from '../../types/hr';
import {
  HelpCircle,
  Plus,
  Copy,
  Trash2,
  Edit2,
  Lock,
  Unlock,
  Eye,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  CheckCircle2,
  Layers,
  ArrowUp,
  ArrowDown,
  X,
} from 'lucide-react';

interface QuestionDraft {
  id?: string;
  questionText: string;
  sequenceOrder: number;
  guidance: string;
}

const DEFAULT_CATEGORIES = ['Technical', 'Behavioral', 'System Design', 'Leadership', 'Culture Fit', 'General'];

export const HRQuestionSetsPage: React.FC = () => {
  const [questionSets, setQuestionSets] = useState<QuestionSet[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Filters
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals & Expanded details
  const [previewSet, setPreviewSet] = useState<QuestionSet | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  // Editor Modal (Create or Edit)
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingSetId, setEditingSetId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'Technical',
  });
  const [formQuestions, setFormQuestions] = useState<QuestionDraft[]>([
    { questionText: '', sequenceOrder: 0, guidance: '' },
  ]);
  const [isSaving, setIsSaving] = useState(false);

  // Duplicate Modal
  const [duplicateTarget, setDuplicateTarget] = useState<QuestionSet | null>(null);
  const [duplicateTitle, setDuplicateTitle] = useState('');
  const [isDuplicating, setIsDuplicating] = useState(false);

  // Delete Confirmation
  const [deleteTarget, setDeleteTarget] = useState<QuestionSet | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchSets = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getQuestionSets();
      setQuestionSets(data || []);
    } catch (err: any) {
      setError(err?.message || 'Failed to load question sets.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSets();
  }, []);

  const showSuccess = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(null), 4000);
  };

  // Preview Question Set
  const handleOpenPreview = async (qs: QuestionSet) => {
    setPreviewLoading(true);
    setPreviewSet(qs);
    try {
      const detailed = await getQuestionSetById(qs.id);
      setPreviewSet(detailed);
    } catch (err: any) {
      setError(err?.message || 'Failed to load question set details.');
    } finally {
      setPreviewLoading(false);
    }
  };

  // Open Create
  const handleOpenCreate = () => {
    setEditingSetId(null);
    setFormData({
      title: '',
      description: '',
      category: 'Technical',
    });
    setFormQuestions([{ questionText: '', sequenceOrder: 0, guidance: '' }]);
    setIsEditorOpen(true);
  };

  // Open Edit
  const handleOpenEdit = async (qs: QuestionSet) => {
    if (qs.isUsedByInterviews) {
      setError('This question set is locked because it is used in interviews. Duplicate it to create an editable copy.');
      return;
    }
    setEditingSetId(qs.id);
    setFormData({
      title: qs.title,
      description: qs.description || '',
      category: qs.category || 'Technical',
    });

    try {
      const detailed = await getQuestionSetById(qs.id);
      if (detailed.questions && detailed.questions.length > 0) {
        setFormQuestions(
          detailed.questions.map((q, idx) => ({
            id: q.id,
            questionText: q.questionText,
            sequenceOrder: q.sequenceOrder ?? idx,
            guidance: q.guidance || '',
          }))
        );
      } else {
        setFormQuestions([{ questionText: '', sequenceOrder: 0, guidance: '' }]);
      }
      setIsEditorOpen(true);
    } catch (err: any) {
      setError(err?.message || 'Failed to load question details for editing.');
    }
  };

  // Question manipulation in Form
  const handleAddQuestionRow = () => {
    setFormQuestions((prev) => [
      ...prev,
      { questionText: '', sequenceOrder: prev.length, guidance: '' },
    ]);
  };

  const handleRemoveQuestionRow = (index: number) => {
    if (formQuestions.length <= 1) return;
    setFormQuestions((prev) => {
      const updated = prev.filter((_, i) => i !== index);
      return updated.map((q, idx) => ({ ...q, sequenceOrder: idx }));
    });
  };

  const handleMoveQuestion = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= formQuestions.length) return;

    setFormQuestions((prev) => {
      const copy = [...prev];
      const temp = copy[index];
      copy[index] = copy[targetIndex];
      copy[targetIndex] = temp;
      return copy.map((q, idx) => ({ ...q, sequenceOrder: idx }));
    });
  };

  const handleQuestionChange = (index: number, field: 'questionText' | 'guidance', val: string) => {
    setFormQuestions((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: val };
      return copy;
    });
  };

  // Save (Create or Update)
  const handleSaveForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      setError('Please provide a title for the question set.');
      return;
    }
    const validQuestions = formQuestions.filter((q) => q.questionText.trim().length > 0);
    if (validQuestions.length === 0) {
      setError('Please provide at least one non-empty question.');
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      const payload = {
        title: formData.title.trim(),
        description: formData.description.trim() || undefined,
        category: formData.category,
        questions: validQuestions.map((q, idx) => ({
          questionText: q.questionText.trim(),
          sequenceOrder: idx,
          guidance: q.guidance.trim() || undefined,
        })),
      };

      if (editingSetId) {
        await updateQuestionSet(editingSetId, payload);
        showSuccess(`Question set "${formData.title}" updated successfully.`);
      } else {
        await createQuestionSet(payload);
        showSuccess(`Question set "${formData.title}" created successfully.`);
      }
      setIsEditorOpen(false);
      await fetchSets();
    } catch (err: any) {
      setError(err?.message || 'Failed to save question set.');
    } finally {
      setIsSaving(false);
    }
  };

  // Open Duplicate
  const handleOpenDuplicate = (qs: QuestionSet) => {
    setDuplicateTarget(qs);
    setDuplicateTitle(`${qs.title} (Copy)`);
  };

  // Confirm Duplicate
  const handleConfirmDuplicate = async () => {
    if (!duplicateTarget) return;
    setIsDuplicating(true);
    setError(null);
    try {
      await duplicateQuestionSet(duplicateTarget.id, duplicateTitle.trim() || undefined);
      showSuccess(`Duplicated "${duplicateTarget.title}" into a new editable question set.`);
      setDuplicateTarget(null);
      await fetchSets();
    } catch (err: any) {
      setError(err?.message || 'Failed to duplicate question set.');
    } finally {
      setIsDuplicating(false);
    }
  };

  // Delete Action
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    setError(null);
    try {
      await deleteQuestionSet(deleteTarget.id);
      showSuccess(`Question set "${deleteTarget.title}" deleted.`);
      setDeleteTarget(null);
      await fetchSets();
    } catch (err: any) {
      setError(err?.message || 'Failed to delete question set. It may be linked to interviews.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Distinct categories
  const allCategories = Array.from(
    new Set([...DEFAULT_CATEGORIES, ...questionSets.map((s) => s.category).filter(Boolean)])
  );

  // Filtered sets
  const filteredSets = questionSets.filter((qs) => {
    const matchesCategory = selectedCategory === 'ALL' || qs.category === selectedCategory;
    const matchesQuery =
      !searchQuery ||
      qs.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (qs.description && qs.description.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesQuery;
  });

  return (
    <div className="page-container hr-question-sets-page">
      {/* Header */}
      <div className="page-header">
        <div>
          <div className="breadcrumb">
            <Link to="/hr">HR Dashboard</Link> &gt; <span>Question Sets</span>
          </div>
          <div className="page-title-row">
            <h1 className="page-title">Interview Question Sets</h1>
            <span className="badge badge-info" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Layers size={13} /> {questionSets.length} Total Sets
            </span>
          </div>
          <p className="page-subtitle">
            Create structured evaluation sets and guidance for interview stages. Sets used in active interviews remain locked to preserve historical interview integrity.
          </p>
        </div>

        <div className="page-actions">
          <button className="btn btn-primary" onClick={handleOpenCreate}>
            <Plus size={16} /> Create Question Set
          </button>
        </div>
      </div>

      {error && (
        <div className="page-alert page-alert--error mb-4" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{error}</span>
          <button onClick={() => setError(null)} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}>✕</button>
        </div>
      )}
      {successMessage && (
        <div className="page-alert page-alert--success mb-4" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <CheckCircle2 size={16} />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="content-card mb-4" style={{ padding: '16px 20px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)' }}>Category:</span>
            <button
              onClick={() => setSelectedCategory('ALL')}
              className={`btn btn-sm ${selectedCategory === 'ALL' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ borderRadius: '16px', fontSize: '0.78rem' }}
            >
              All ({questionSets.length})
            </button>
            {allCategories.map((cat) => {
              const count = questionSets.filter((s) => s.category === cat).length;
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`btn btn-sm ${selectedCategory === cat ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ borderRadius: '16px', fontSize: '0.78rem' }}
                >
                  {cat} ({count})
                </button>
              );
            })}
          </div>

          <div style={{ minWidth: '240px' }}>
            <input
              type="text"
              className="form-input"
              placeholder="Search question sets..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ padding: '6px 12px', fontSize: '0.85rem' }}
            />
          </div>
        </div>
      </div>

      {/* Grid of Question Sets */}
      {isLoading ? (
        <div className="page-loading-state">
          <div className="spinner" />
          <p>Loading question sets...</p>
        </div>
      ) : filteredSets.length === 0 ? (
        <div className="content-card">
          <div className="dashboard-empty-state">
            <Layers size={48} style={{ opacity: 0.3, marginBottom: '12px' }} />
            <h3>No Question Sets Found</h3>
            <p style={{ color: 'var(--text-muted)' }}>
              {searchQuery || selectedCategory !== 'ALL'
                ? 'No question sets match your selected filters.'
                : 'No interview question sets have been created yet.'}
            </p>
            <button className="btn btn-primary mt-3" onClick={handleOpenCreate}>
              <Plus size={16} /> Create Your First Question Set
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '20px' }}>
          {filteredSets.map((qs) => {
            const isLocked = qs.isUsedByInterviews;
            return (
              <div
                key={qs.id}
                className="content-card"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  borderTop: isLocked ? '3px solid #f59e0b' : '3px solid #10b981',
                  transition: 'transform 0.15s, box-shadow 0.15s',
                }}
              >
                <div>
                  {/* Card Top Row */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                    <span
                      style={{
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        padding: '3px 8px',
                        borderRadius: '4px',
                        background: 'rgba(99,102,241,0.12)',
                        color: 'var(--primary)',
                      }}
                    >
                      {qs.category || 'General'}
                    </span>

                    {isLocked ? (
                      <span
                        title="Used in recorded interviews. Questions locked to preserve historical evaluation integrity."
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontSize: '0.72rem',
                          fontWeight: 600,
                          padding: '3px 8px',
                          borderRadius: '12px',
                          background: 'rgba(245, 158, 11, 0.12)',
                          color: '#f59e0b',
                          border: '1px solid rgba(245, 158, 11, 0.3)',
                        }}
                      >
                        <Lock size={11} /> Locked — Used in Interviews
                      </span>
                    ) : (
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontSize: '0.72rem',
                          fontWeight: 600,
                          padding: '3px 8px',
                          borderRadius: '12px',
                          background: 'rgba(16, 185, 129, 0.12)',
                          color: '#10b981',
                          border: '1px solid rgba(16, 185, 129, 0.3)',
                        }}
                      >
                        <Unlock size={11} /> Editable Draft
                      </span>
                    )}
                  </div>

                  {/* Title & Description */}
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-main)' }}>
                    {qs.title}
                  </h3>
                  <p
                    style={{
                      fontSize: '0.85rem',
                      color: 'var(--text-muted)',
                      lineHeight: 1.5,
                      marginBottom: '14px',
                      minHeight: '38px',
                    }}
                  >
                    {qs.description || <em style={{ opacity: 0.6 }}>No description provided.</em>}
                  </p>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
                      <HelpCircle size={14} /> {qs.questionCount ?? qs.questions?.length ?? 0} Questions
                    </span>
                    <span>•</span>
                    <span>Created: {new Date(qs.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>

                {/* Card Actions Footer */}
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '8px',
                    paddingTop: '14px',
                    borderTop: '1px solid var(--border-subtle, rgba(255,255,255,0.06))',
                  }}
                >
                  <button
                    className="btn btn-sm btn-secondary"
                    onClick={() => handleOpenPreview(qs)}
                    title="Preview questions and guidance"
                    style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                  >
                    <Eye size={13} /> View
                  </button>

                  {isLocked ? (
                    <button
                      className="btn btn-sm btn-outline-primary"
                      onClick={() => handleOpenDuplicate(qs)}
                      title="Duplicate to create an editable copy"
                      style={{ flex: 1.5, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                    >
                      <Copy size={13} /> Duplicate → Edit
                    </button>
                  ) : (
                    <button
                      className="btn btn-sm btn-outline-primary"
                      onClick={() => handleOpenEdit(qs)}
                      title="Edit question set"
                      style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                    >
                      <Edit2 size={13} /> Edit
                    </button>
                  )}

                  <button
                    className="btn btn-sm btn-secondary"
                    onClick={() => handleOpenDuplicate(qs)}
                    title="Duplicate question set"
                  >
                    <Copy size={13} />
                  </button>

                  {!isLocked && (
                    <button
                      className="btn btn-sm btn-secondary"
                      onClick={() => setDeleteTarget(qs)}
                      title="Delete draft question set"
                      style={{ color: '#f87171' }}
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── MODAL: PREVIEW QUESTIONS ────────────────────────────────────────── */}
      {previewSet && (
        <div className="modal-backdrop" onClick={() => setPreviewSet(null)}>
          <div
            className="modal-container"
            style={{ maxWidth: '650px', maxHeight: '85vh', overflowY: 'auto' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 600, textTransform: 'uppercase' }}>
                  {previewSet.category}
                </span>
                <h2 style={{ fontSize: '1.25rem', marginTop: '2px' }}>{previewSet.title}</h2>
              </div>
              <button className="modal-close-btn" onClick={() => setPreviewSet(null)}>✕</button>
            </div>

            <div className="modal-body">
              {previewSet.description && (
                <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', marginBottom: '16px', lineHeight: 1.6 }}>
                  {previewSet.description}
                </p>
              )}

              {previewSet.isUsedByInterviews && (
                <div
                  style={{
                    padding: '10px 14px',
                    borderRadius: '8px',
                    background: 'rgba(245, 158, 11, 0.1)',
                    border: '1px solid rgba(245, 158, 11, 0.3)',
                    color: '#f59e0b',
                    fontSize: '0.82rem',
                    marginBottom: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <Lock size={15} />
                  <span>
                    Locked question set — Associated with active candidate interviews. To customize, duplicate it.
                  </span>
                </div>
              )}

              <h4 style={{ fontSize: '0.95rem', marginBottom: '12px', color: 'var(--text-main)' }}>
                Structured Questions ({previewSet.questions?.length ?? 0})
              </h4>

              {previewLoading ? (
                <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                  <div className="spinner" />
                  <p>Loading questions...</p>
                </div>
              ) : !previewSet.questions || previewSet.questions.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No questions configured in this set.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {previewSet.questions.map((q, idx) => (
                    <div
                      key={q.id || idx}
                      style={{
                        padding: '12px 16px',
                        borderRadius: '8px',
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid var(--border-subtle, rgba(255,255,255,0.08))',
                      }}
                    >
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                        <span
                          style={{
                            background: 'var(--primary)',
                            color: '#fff',
                            width: '22px',
                            height: '22px',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            flexShrink: 0,
                            marginTop: '2px',
                          }}
                        >
                          {idx + 1}
                        </span>
                        <div style={{ flex: 1 }}>
                          <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-main)' }}>
                            {q.questionText}
                          </p>
                          {q.guidance && (
                            <div
                              style={{
                                marginTop: '6px',
                                padding: '6px 10px',
                                borderRadius: '6px',
                                background: 'rgba(99,102,241,0.08)',
                                borderLeft: '3px solid var(--primary)',
                                fontSize: '0.8rem',
                                color: 'var(--text-muted)',
                              }}
                            >
                              <strong>Evaluation Guidance:</strong> {q.guidance}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between' }}>
              <div>
                {previewSet.isUsedByInterviews ? (
                  <button
                    className="btn btn-outline-primary"
                    onClick={() => {
                      const s = previewSet;
                      setPreviewSet(null);
                      handleOpenDuplicate(s);
                    }}
                  >
                    <Copy size={14} /> Duplicate to Editable Set
                  </button>
                ) : (
                  <button
                    className="btn btn-outline-primary"
                    onClick={() => {
                      const s = previewSet;
                      setPreviewSet(null);
                      handleOpenEdit(s);
                    }}
                  >
                    <Edit2 size={14} /> Edit Questions
                  </button>
                )}
              </div>
              <button className="btn btn-secondary" onClick={() => setPreviewSet(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: CREATE / EDIT QUESTION SET ────────────────────────────────── */}
      {isEditorOpen && (
        <div className="modal-backdrop" onClick={() => !isSaving && setIsEditorOpen(false)}>
          <div
            className="modal-container"
            style={{ maxWidth: '720px', maxHeight: '90vh', overflowY: 'auto' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2 style={{ fontSize: '1.25rem' }}>
                {editingSetId ? 'Edit Question Set' : 'Create New Question Set'}
              </h2>
              <button className="modal-close-btn" onClick={() => !isSaving && setIsEditorOpen(false)}>✕</button>
            </div>

            <form onSubmit={handleSaveForm}>
              <div className="modal-body">
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '14px', marginBottom: '14px' }}>
                  <div className="form-group">
                    <label className="form-label">Title *</label>
                    <input
                      type="text"
                      className="form-input"
                      required
                      placeholder="e.g. Senior Frontend Architecture Interview"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Category</label>
                    <select
                      className="form-select"
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    >
                      {DEFAULT_CATEGORIES.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-group mb-4">
                  <label className="form-label">Description (Optional)</label>
                  <textarea
                    className="form-textarea"
                    rows={2}
                    placeholder="Provide context for interviewers using this evaluation set..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>

                {/* Question Builder */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <h4 style={{ margin: 0, fontSize: '0.95rem', color: 'var(--text-main)' }}>
                    Questions ({formQuestions.length})
                  </h4>
                  <button
                    type="button"
                    className="btn btn-sm btn-secondary"
                    onClick={handleAddQuestionRow}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                  >
                    <Plus size={14} /> Add Question
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {formQuestions.map((q, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: '12px 14px',
                        borderRadius: '8px',
                        background: 'rgba(255,255,255,0.02)',
                        border: '1px solid var(--border-subtle, rgba(255,255,255,0.08))',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--primary)' }}>
                          Question #{idx + 1}
                        </span>
                        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                          <button
                            type="button"
                            className="btn btn-sm btn-secondary"
                            style={{ padding: '2px 6px', height: '24px' }}
                            disabled={idx === 0}
                            onClick={() => handleMoveQuestion(idx, 'up')}
                            title="Move Up"
                          >
                            <ArrowUp size={12} />
                          </button>
                          <button
                            type="button"
                            className="btn btn-sm btn-secondary"
                            style={{ padding: '2px 6px', height: '24px' }}
                            disabled={idx === formQuestions.length - 1}
                            onClick={() => handleMoveQuestion(idx, 'down')}
                            title="Move Down"
                          >
                            <ArrowDown size={12} />
                          </button>
                          {formQuestions.length > 1 && (
                            <button
                              type="button"
                              className="btn btn-sm btn-secondary"
                              style={{ padding: '2px 6px', height: '24px', color: '#f87171' }}
                              onClick={() => handleRemoveQuestionRow(idx)}
                              title="Delete question"
                            >
                              <X size={12} />
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="form-group mb-2">
                        <input
                          type="text"
                          className="form-input"
                          required
                          placeholder="e.g. Describe your approach to optimizing core web vitals in Next.js"
                          value={q.questionText}
                          onChange={(e) => handleQuestionChange(idx, 'questionText', e.target.value)}
                        />
                      </div>

                      <div className="form-group" style={{ margin: 0 }}>
                        <input
                          type="text"
                          className="form-input"
                          placeholder="Guidance for interviewer: Look for LCP, CLS, FID understanding (optional)"
                          value={q.guidance}
                          onChange={(e) => handleQuestionChange(idx, 'guidance', e.target.value)}
                          style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsEditorOpen(false)}
                  disabled={isSaving}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={isSaving}>
                  {isSaving ? 'Saving...' : editingSetId ? 'Save Changes' : 'Create Question Set'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: DUPLICATE ─────────────────────────────────────────────────── */}
      {duplicateTarget && (
        <div className="modal-backdrop" onClick={() => !isDuplicating && setDuplicateTarget(null)}>
          <div className="modal-container" style={{ maxWidth: '480px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 style={{ fontSize: '1.2rem' }}>Duplicate Question Set</h2>
              <button className="modal-close-btn" onClick={() => !isDuplicating && setDuplicateTarget(null)}>✕</button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '14px' }}>
                Creates a new editable draft set with all {duplicateTarget.questionCount ?? duplicateTarget.questions?.length ?? 0} questions copied from <strong>"{duplicateTarget.title}"</strong>.
              </p>
              <div className="form-group">
                <label className="form-label">New Question Set Title *</label>
                <input
                  type="text"
                  className="form-input"
                  required
                  value={duplicateTitle}
                  onChange={(e) => setDuplicateTitle(e.target.value)}
                />
              </div>
            </div>
            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                className="btn btn-secondary"
                onClick={() => setDuplicateTarget(null)}
                disabled={isDuplicating}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleConfirmDuplicate}
                disabled={isDuplicating || !duplicateTitle.trim()}
              >
                {isDuplicating ? 'Duplicating...' : 'Duplicate Question Set'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: DELETE CONFIRMATION ───────────────────────────────────────── */}
      {deleteTarget && (
        <div className="modal-backdrop" onClick={() => !isDeleting && setDeleteTarget(null)}>
          <div className="modal-container" style={{ maxWidth: '440px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 style={{ fontSize: '1.2rem', color: '#f87171' }}>Delete Question Set</h2>
              <button className="modal-close-btn" onClick={() => !isDeleting && setDeleteTarget(null)}>✕</button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: '0.88rem', color: 'var(--text-main)', marginBottom: '10px' }}>
                Are you sure you want to delete <strong>"{deleteTarget.title}"</strong>?
              </p>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                This draft question set is not linked to any interview and will be permanently removed.
              </p>
            </div>
            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button className="btn btn-secondary" onClick={() => setDeleteTarget(null)} disabled={isDeleting}>
                Cancel
              </button>
              <button
                className="btn btn-danger"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                style={{ background: '#ef4444', borderColor: '#ef4444', color: '#fff' }}
              >
                {isDeleting ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

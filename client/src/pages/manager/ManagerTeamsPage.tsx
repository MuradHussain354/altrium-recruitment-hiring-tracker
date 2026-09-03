import React, { useEffect, useState } from 'react';
import { managerTeamsApi } from '../../api/managerTeams.api';
import { TeamOption } from '../../types/manager';
import { Users2, Plus, AlertCircle, CheckCircle2, RefreshCw, Layers } from 'lucide-react';

export const ManagerTeamsPage: React.FC = () => {
  const [teams, setTeams] = useState<TeamOption[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [teamName, setTeamName] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const fetchTeams = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await managerTeamsApi.listTeams();
      setTeams(res.data);
      setIsLoading(false);
    } catch (err: any) {
      setError(err.message || 'Failed to load teams.');
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTeams();
  }, []);

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSuccessMessage(null);

    const trimmed = teamName.trim();
    if (!trimmed) {
      setFormError('Team name cannot be empty.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await managerTeamsApi.createTeam({ name: trimmed });
      setIsSubmitting(false);
      setSuccessMessage(`Team "${res.data.name}" created successfully.`);
      setTeamName('');
      fetchTeams();
    } catch (err: any) {
      setIsSubmitting(false);
      setFormError(err.message || 'Failed to create team.');
    }
  };

  return (
    <div style={{ maxWidth: '1050px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-main)', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Users2 color="var(--primary)" size={24} /> Team Management
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: '4px 0 0 0' }}>
            Create and oversee organizational hiring and evaluation teams.
          </p>
        </div>
      </div>

      {/* Create Team Form Card */}
      <div className="glass-card" style={{ padding: '28px', marginBottom: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
          <Plus color="var(--primary)" size={22} />
          <div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, color: 'var(--text-main)' }}>
              Create New Team
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
              Define a functional team for assigning applications and technical evaluators.
            </p>
          </div>
        </div>

        {formError && (
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
            <span>{formError}</span>
          </div>
        )}

        {successMessage && (
          <div style={{
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            borderRadius: '8px',
            padding: '12px 16px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            color: 'var(--accent-emerald)',
            fontSize: '0.875rem'
          }}>
            <CheckCircle2 size={18} style={{ flexShrink: 0 }} />
            <span>{successMessage}</span>
          </div>
        )}

        <form onSubmit={handleCreateTeam}>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <div style={{ flex: '1', minWidth: '280px' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '6px' }}>
                Team Name *
              </label>
              <input
                type="text"
                placeholder="e.g. AI Engineering, Platform Infrastructure"
                value={teamName}
                onChange={(e) => {
                  setTeamName(e.target.value);
                  if (formError) setFormError(null);
                }}
                className="input-field"
                style={{ width: '100%' }}
                required
                maxLength={100}
              />
            </div>
            <div style={{ marginTop: '25px' }}>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={isSubmitting}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 24px' }}
              >
                <Plus size={16} />
                {isSubmitting ? 'Creating Team...' : 'Create Team'}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Existing Teams Directory */}
      <div className="glass-card" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, color: 'var(--text-main)' }}>
              Existing Teams
            </h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              <Layers size={14} color="var(--accent-cyan)" />
              <span>Teams available across HR assignment and Staff account provisioning.</span>
            </div>
          </div>

          <button
            onClick={fetchTeams}
            className="btn btn-secondary"
            disabled={isLoading}
            style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <RefreshCw size={14} className={isLoading ? 'spin' : ''} /> Refresh Teams
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
            color: '#f87171'
          }}>
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        {isLoading ? (
          <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
            Loading teams...
          </div>
        ) : teams.length === 0 ? (
          <div style={{ padding: '40px 24px', textAlign: 'center', color: 'var(--text-subtle)' }}>
            No teams have been created yet. Use the form above to add your first team.
          </div>
        ) : (
          <div style={{ borderRadius: '8px', border: '1px solid var(--border-subtle)', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ backgroundColor: 'rgba(255, 255, 255, 0.03)', borderBottom: '1px solid var(--border-subtle)', textAlign: 'left' }}>
                  <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontWeight: 600 }}>Team Name</th>
                  <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontWeight: 600, textAlign: 'right' }}>Team ID</th>
                </tr>
              </thead>
              <tbody>
                {teams.map((t) => (
                  <tr key={t.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.03)' }}>
                    <td style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-main)' }}>
                      {t.name}
                    </td>
                    <td style={{ padding: '12px 16px', color: 'var(--text-muted)', textAlign: 'right', fontFamily: 'monospace', fontSize: '0.8rem' }}>
                      {t.id}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default ManagerTeamsPage;

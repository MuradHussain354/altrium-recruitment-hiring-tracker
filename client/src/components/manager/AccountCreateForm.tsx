import React, { useEffect, useState } from 'react';
import { managerAccountsApi } from '../../api/managerAccounts.api';
import { TeamOption } from '../../types/manager';
import { UserPlus, AlertCircle, CheckCircle2 } from 'lucide-react';

interface AccountCreateFormProps {
  onAccountCreated: () => void;
}

export const AccountCreateForm: React.FC<AccountCreateFormProps> = ({ onAccountCreated }) => {
  const [name, setName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [role, setRole] = useState<'HR' | 'TeamLead'>('HR');
  const [teamId, setTeamId] = useState<string>('');

  const [teams, setTeams] = useState<TeamOption[]>([]);
  const [isLoadingTeams, setIsLoadingTeams] = useState<boolean>(true);

  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    const fetchTeams = async () => {
      try {
        setIsLoadingTeams(true);
        const res = await managerAccountsApi.listTeams();
        setTeams(res.data);
        setIsLoadingTeams(false);
      } catch {
        setIsLoadingTeams(false);
      }
    };
    fetchTeams();
  }, []);

  const validatePassword = (pass: string): string | null => {
    if (pass.length < 8) return 'Password must be at least 8 characters long.';
    if (!/[A-Z]/.test(pass)) return 'Password must contain at least one uppercase letter.';
    if (!/[a-z]/.test(pass)) return 'Password must contain at least one lowercase letter.';
    if (!/[0-9]/.test(pass)) return 'Password must contain at least one number.';
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (name.trim().length < 2) {
      setError('Name must be at least 2 characters long.');
      return;
    }

    if (!email.trim() || !email.includes('@')) {
      setError('A valid email address is required.');
      return;
    }

    const passError = validatePassword(password);
    if (passError) {
      setError(passError);
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await managerAccountsApi.createUser({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
        role,
        teamId: teamId || null
      });

      setIsSubmitting(false);
      setSuccessMessage(`Account created successfully for ${res.user.email} (${res.user.role})`);
      setName('');
      setEmail('');
      setPassword('');
      setRole('HR');
      setTeamId('');
      onAccountCreated();
    } catch (err: any) {
      setIsSubmitting(false);
      setError(err.message || 'Failed to create user account.');
    }
  };

  return (
    <div className="glass-card" style={{ padding: '28px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
        <UserPlus color="var(--primary)" size={22} />
        <div>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, color: 'var(--text-main)' }}>
            Provision Managed User Account
          </h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
            Create new HR or Team Lead staff accounts with designated roles.
          </p>
        </div>
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

      <form onSubmit={handleSubmit}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '18px', marginBottom: '18px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '6px' }}>
              Full Name *
            </label>
            <input
              type="text"
              placeholder="e.g. Sarah Jenkins"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input-field"
              style={{ width: '100%' }}
              required
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '6px' }}>
              Email Address *
            </label>
            <input
              type="email"
              placeholder="e.g. sarah.jenkins@altrium.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input-field"
              style={{ width: '100%' }}
              required
            />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '18px', marginBottom: '18px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '6px' }}>
              Initial Password *
            </label>
            <input
              type="password"
              placeholder="Min 8 chars (1 upper, 1 lower, 1 digit)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-field"
              style={{ width: '100%' }}
              required
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '6px' }}>
              Account Role *
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as 'HR' | 'TeamLead')}
              className="input-field"
              style={{ width: '100%' }}
            >
              <option value="HR">HR Recruiter</option>
              <option value="TeamLead">Team Lead (Technical Evaluator)</option>
            </select>
          </div>
        </div>

        <div style={{ marginBottom: '24px' }}>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '6px' }}>
            Assign Team (Optional)
          </label>
          <select
            value={teamId}
            onChange={(e) => setTeamId(e.target.value)}
            className="input-field"
            style={{ width: '100%' }}
            disabled={isLoadingTeams}
          >
            <option value="">No Team Assigned</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={isSubmitting}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 24px' }}
          >
            {isSubmitting ? 'Provisioning Account...' : 'Create Account'}
          </button>
        </div>
      </form>
    </div>
  );
};

import React, { useEffect, useState } from 'react';
import { useAuth } from '../../auth/AuthContext';
import { managerAccountsApi } from '../../api/managerAccounts.api';
import { EligibleUser } from '../../types/manager';
import { AccountCreateForm } from '../../components/manager/AccountCreateForm';
import { AccountStatusToggle } from '../../components/manager/AccountStatusToggle';
import { Users, Info, AlertCircle, RefreshCw } from 'lucide-react';

export const ManagerAccountsPage: React.FC = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState<EligibleUser[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await managerAccountsApi.listManagedUsers();
      setUsers(res.data);
      setIsLoading(false);
    } catch (err: any) {
      setError(err.message || 'Failed to load staff directory.');
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  return (
    <div style={{ maxWidth: '1050px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-main)', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Users color="var(--primary)" size={24} /> User Account Management
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: '4px 0 0 0' }}>
            Provision staff accounts and manage user activation statuses.
          </p>
        </div>
      </div>

      {/* Account Creation Form */}
      <div style={{ marginBottom: '32px' }}>
        <AccountCreateForm onAccountCreated={fetchUsers} />
      </div>

      {/* Account Directory */}
      <div className="glass-card" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, color: 'var(--text-main)' }}>
              Staff Directory
            </h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              <Info size={14} color="var(--accent-cyan)" />
              <span>Active and inactive HR/Team Lead accounts are shown. Deactivated accounts cannot log in or be selected for interviews. Managers can reactivate them from this directory.</span>
            </div>
          </div>

          <button
            onClick={fetchUsers}
            className="btn btn-secondary"
            disabled={isLoading}
            style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <RefreshCw size={14} className={isLoading ? 'spin' : ''} /> Refresh Directory
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
            Loading staff directory...
          </div>
        ) : users.length === 0 ? (
          <div style={{ padding: '40px 24px', textAlign: 'center', color: 'var(--text-subtle)' }}>
            No HR or Team Lead accounts found in the directory.
          </div>
        ) : (
          <div style={{ borderRadius: '8px', border: '1px solid var(--border-subtle)', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ backgroundColor: 'rgba(255, 255, 255, 0.03)', borderBottom: '1px solid var(--border-subtle)', textAlign: 'left' }}>
                  <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontWeight: 600 }}>Name</th>
                  <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontWeight: 600 }}>Email</th>
                  <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontWeight: 600 }}>Role</th>
                  <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontWeight: 600 }}>Status</th>
                  <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontWeight: 600, textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.03)' }}>
                    <td style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-main)' }}>
                      {u.name} {u.id === user?.id && '(You)'}
                    </td>
                    <td style={{ padding: '12px 16px', color: 'var(--text-main)' }}>
                      {u.email}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span className={`badge ${u.role === 'HR' ? 'badge-cyan' : 'badge-emerald'}`} style={{ fontSize: '0.75rem' }}>
                        {u.role}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span className={`badge ${u.isActive ? 'badge-emerald' : 'badge-amber'}`} style={{ fontSize: '0.75rem' }}>
                        {u.isActive ? 'Active' : u.invitationPending ? 'Invited (Pending)' : 'Inactive'}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                      <AccountStatusToggle
                        userItem={u}
                        currentUserId={user?.id}
                        onStatusChanged={fetchUsers}
                      />
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

export default ManagerAccountsPage;

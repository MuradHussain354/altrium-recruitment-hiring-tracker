import React, { useState } from 'react';
import { managerAccountsApi } from '../../api/managerAccounts.api';
import { EligibleUser } from '../../types/manager';
import { UserX, UserCheck, AlertCircle, Send, CheckCircle2 } from 'lucide-react';

interface AccountStatusToggleProps {
  userItem: EligibleUser;
  currentUserId?: string;
  onStatusChanged: () => void;
}

export const AccountStatusToggle: React.FC<AccountStatusToggleProps> = ({
  userItem,
  currentUserId,
  onStatusChanged
}) => {
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [resendSent, setResendSent] = useState<boolean>(false);

  const isSelf = currentUserId === userItem.id;
  const isInvitationPending = !userItem.isActive && !!userItem.invitationPending;

  const handleResend = async () => {
    setError(null);
    setIsUpdating(true);
    try {
      await managerAccountsApi.resendInvitation(userItem.id);
      setIsUpdating(false);
      setResendSent(true);
      setTimeout(() => setResendSent(false), 4000);
    } catch (err: any) {
      setIsUpdating(false);
      setError(err.message || 'Failed to resend invitation.');
    }
  };

  // Invited-but-not-yet-accepted accounts cannot be "Activated" directly —
  // the account has no usable password until the user completes acceptance
  // via their invitation link. Offer Resend Invitation instead.
  if (isInvitationPending) {
    return (
      <div>
        {error && (
          <div style={{ fontSize: '0.75rem', color: '#f87171', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <AlertCircle size={12} /> {error}
          </div>
        )}
        <button
          onClick={handleResend}
          disabled={isUpdating}
          className="btn btn-secondary"
          style={{ fontSize: '0.78rem', padding: '4px 10px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
        >
          {isUpdating ? (
            'Sending...'
          ) : resendSent ? (
            <>
              <CheckCircle2 size={14} color="var(--accent-emerald)" /> Sent
            </>
          ) : (
            <>
              <Send size={14} /> Resend Invitation
            </>
          )}
        </button>
      </div>
    );
  }

  const handleToggle = async () => {
    if (isSelf) {
      setError('Managers cannot deactivate their own account.');
      return;
    }

    const nextStatus = !userItem.isActive;
    const confirmMsg = `Are you sure you want to deactivate account for ${userItem.name} (${userItem.email})? Note: Deactivated accounts will disappear from the active directory.`;

    if (userItem.isActive && !window.confirm(confirmMsg)) {
      return;
    }

    setError(null);
    setIsUpdating(true);

    try {
      await managerAccountsApi.setUserStatus(userItem.id, nextStatus);
      setIsUpdating(false);
      onStatusChanged();
    } catch (err: any) {
      setIsUpdating(false);
      setError(err.message || 'Failed to update account status.');
    }
  };

  return (
    <div>
      {error && (
        <div style={{
          fontSize: '0.75rem',
          color: '#f87171',
          marginBottom: '4px',
          display: 'flex',
          alignItems: 'center',
          gap: '4px'
        }}>
          <AlertCircle size={12} /> {error}
        </div>
      )}
      <button
        onClick={handleToggle}
        disabled={isUpdating || isSelf}
        className={`btn ${userItem.isActive ? 'btn-secondary' : 'btn-primary'}`}
        style={{
          fontSize: '0.78rem',
          padding: '4px 10px',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          opacity: isSelf ? 0.5 : 1,
          cursor: isSelf ? 'not-allowed' : 'pointer'
        }}
        title={isSelf ? 'Self-deactivation is disabled' : undefined}
      >
        {isUpdating ? (
          'Updating...'
        ) : userItem.isActive ? (
          <>
            <UserX size={14} color="var(--accent-amber)" /> Deactivate
          </>
        ) : (
          <>
            <UserCheck size={14} /> Activate
          </>
        )}
      </button>
    </div>
  );
};

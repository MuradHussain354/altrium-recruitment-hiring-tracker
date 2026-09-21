export type Role = 'Manager' | 'HR' | 'TeamLead';

export const STORAGE_KEYS = {
  AUTH_TOKEN: 'altrium_auth_token',
  TWO_FACTOR_TEMP_TOKEN: 'altrium_2fa_temp_token',
} as const;

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  isActive: boolean;
  teamId: string | null;
  createdById: string | null;
  createdAt: string;
  twoFactorEnabled?: boolean;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

/** Returned when password is correct and 2FA is disabled — direct login */
export interface AuthResponse {
  requires2FA: false;
  token: string;
  user: User;
}

/** Returned when password is correct and 2FA is enabled — challenge required */
export interface TwoFactorChallengeResponse {
  requires2FA: true;
  tempToken: string;
}

export type LoginResponse = AuthResponse | TwoFactorChallengeResponse;

/** Result from POST /auth/2fa/verify-login */
export interface TwoFactorVerifyResponse {
  token: string;
  user: User;
  usedBackupCode?: boolean;
}

/** 2FA status */
export interface TwoFactorStatusResponse {
  enabled: boolean;
  remainingBackupCodes: number;
}

/** 2FA setup (QR code + manual key) */
export interface TwoFactorSetupResponse {
  qrCodeUrl: string;
  otpauthUri: string;
  manualKey: string;
}

/** 2FA enable response (includes backup codes) */
export interface TwoFactorEnableResponse {
  success: true;
  message: string;
  backupCodes: string[];
  warning: string;
}

/** Backup code regeneration response */
export interface BackupCodesRegenerateResponse {
  success: true;
  backupCodes: string[];
  warning: string;
}

export interface ApiErrorResponse {
  error: string;
  message: string;
  details?: Array<{ field?: string; message: string }> | any;
}

/** Sanitized invitation details returned by GET /auth/invitation-details */
export interface InvitationDetails {
  name: string;
  email: string;
  role: Role;
}

/** Result from POST /auth/accept-invitation */
export interface AcceptInvitationResponse {
  token: string;
  user: User;
}

export interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  /** Step 1 login — returns User directly (no 2FA) or throws TwoFactorRequired */
  login: (credentials: LoginCredentials) => Promise<User | TwoFactorChallengeResponse>;
  /** Step 2 login — submits TOTP/backup code with tempToken */
  complete2FALogin: (tempToken: string, code: string) => Promise<User>;
  /** Applies a session (token + user) obtained outside the normal login flow, e.g. after invitation acceptance */
  applySession: (token: string, user: User) => void;
  logout: () => void;
}

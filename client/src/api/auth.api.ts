import {
  STORAGE_KEYS,
  LoginCredentials,
  LoginResponse,
  TwoFactorVerifyResponse,
  TwoFactorStatusResponse,
  TwoFactorSetupResponse,
  TwoFactorEnableResponse,
  BackupCodesRegenerateResponse,
  InvitationDetails,
  AcceptInvitationResponse,
  User,
} from '../types/auth';
import { apiClient } from './apiClient';

// ─── Token Helpers ────────────────────────────────────────────────────────────

export const getToken = (): string | null =>
  localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);

export const setToken = (token: string): void =>
  localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, token);

export const removeToken = (): void =>
  localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);

// ─── Auth Endpoints ───────────────────────────────────────────────────────────

/**
 * Step 1 — Submits email + password.
 * Returns either a direct AuthResponse (requires2FA: false) or a TwoFactorChallengeResponse.
 */
export const loginApi = async (credentials: LoginCredentials): Promise<LoginResponse> =>
  apiClient.post<LoginResponse>('/auth/login', credentials);

/**
 * Step 2 — Submits TOTP code or backup code with the tempToken from Step 1.
 */
export const verify2FALoginApi = async (
  tempToken: string,
  code: string
): Promise<TwoFactorVerifyResponse> =>
  apiClient.post<TwoFactorVerifyResponse>('/auth/2fa/verify-login', { tempToken, code });

/** GET /auth/me — returns current authenticated user */
export const getMeApi = async (): Promise<{ user: User }> =>
  apiClient.get<{ user: User }>('/auth/me');

/** POST /auth/logout */
export const logoutApi = async (): Promise<{ success: true; message: string }> =>
  apiClient.post<{ success: true; message: string }>('/auth/logout', {});

// ─── Account Invitation (S2-45) ────────────────────────────────────────────

/** GET /auth/invitation-details — sanitized details for the acceptance page */
export const getInvitationDetailsApi = async (token: string): Promise<InvitationDetails> =>
  apiClient.get<InvitationDetails>(`/auth/invitation-details?token=${encodeURIComponent(token)}`);

/** POST /auth/accept-invitation — sets password, activates account, returns a session */
export const acceptInvitationApi = async (
  token: string,
  password: string
): Promise<AcceptInvitationResponse> =>
  apiClient.post<AcceptInvitationResponse>('/auth/accept-invitation', { token, password });

// ─── 2FA Management ───────────────────────────────────────────────────────────

/** GET /auth/2fa/status */
export const get2FAStatusApi = async (): Promise<TwoFactorStatusResponse> =>
  apiClient.get<TwoFactorStatusResponse>('/auth/2fa/status');

/** POST /auth/2fa/setup — initiates TOTP enrollment, returns QR code */
export const setup2FAApi = async (): Promise<TwoFactorSetupResponse> =>
  apiClient.post<TwoFactorSetupResponse>('/auth/2fa/setup', {});

/**
 * POST /auth/2fa/enable — confirms enrollment with first TOTP code.
 * Returns backup codes (shown once only).
 */
export const enable2FAApi = async (code: string): Promise<TwoFactorEnableResponse> =>
  apiClient.post<TwoFactorEnableResponse>('/auth/2fa/enable', { code });

/**
 * POST /auth/2fa/disable — disables 2FA.
 * Requires current password + TOTP/backup-code.
 */
export const disable2FAApi = async (
  password: string,
  code: string
): Promise<{ success: true; message: string }> =>
  apiClient.post<{ success: true; message: string }>('/auth/2fa/disable', { password, code });

/**
 * POST /auth/2fa/backup-codes/regenerate — regenerates all backup codes.
 * Requires current password + TOTP code.
 */
export const regenerateBackupCodesApi = async (
  password: string,
  code: string
): Promise<BackupCodesRegenerateResponse> =>
  apiClient.post<BackupCodesRegenerateResponse>('/auth/2fa/backup-codes/regenerate', {
    password,
    code,
  });

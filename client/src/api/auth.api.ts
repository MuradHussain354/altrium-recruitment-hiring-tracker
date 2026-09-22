import {
  STORAGE_KEYS,
  LoginCredentials,
  LoginResponse,
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
 * Submits email + password. Returns a token and the authenticated user directly.
 */
export const loginApi = async (credentials: LoginCredentials): Promise<LoginResponse> =>
  apiClient.post<LoginResponse>('/auth/login', credentials);

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

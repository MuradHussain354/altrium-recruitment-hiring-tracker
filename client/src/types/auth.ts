export type Role = 'Manager' | 'HR' | 'TeamLead';

export const STORAGE_KEYS = {
  AUTH_TOKEN: 'altrium_auth_token',
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
}

export interface LoginCredentials {
  email: string;
  password: string;
}

/** Returned on successful email/password login */
export interface AuthResponse {
  token: string;
  user: User;
}

export type LoginResponse = AuthResponse;

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
  /** Email + password login — returns the authenticated User directly */
  login: (credentials: LoginCredentials) => Promise<User>;
  /** Applies a session (token + user) obtained outside the normal login flow, e.g. after invitation acceptance */
  applySession: (token: string, user: User) => void;
  logout: () => void;
}

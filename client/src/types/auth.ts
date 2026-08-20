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

export interface AuthResponse {
  token: string;
  user: User;
}

export interface ApiErrorResponse {
  error: string;
  message: string;
  details?: Array<{ field?: string; message: string }> | any;
}

export interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<User>;
  logout: () => void;
}

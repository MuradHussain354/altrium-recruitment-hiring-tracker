import { STORAGE_KEYS, LoginCredentials, AuthResponse, User } from '../types/auth';
import { apiClient } from './apiClient';

export const getToken = (): string | null => {
  return localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
};

export const setToken = (token: string): void => {
  localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, token);
};

export const removeToken = (): void => {
  localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
};

export const loginApi = async (credentials: LoginCredentials): Promise<AuthResponse> => {
  return apiClient.post<AuthResponse>('/auth/login', credentials);
};

export const getMeApi = async (): Promise<{ user: User }> => {
  return apiClient.get<{ user: User }>('/auth/me');
};

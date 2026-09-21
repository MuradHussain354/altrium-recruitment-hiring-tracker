import { ApiErrorResponse } from '../types/auth';
import { getToken } from './auth.api';

const getBaseUrl = (): string => {
  const envUrl = import.meta.env.VITE_API_BASE_URL?.trim();
  if (envUrl) {
    return envUrl.endsWith('/') ? envUrl.slice(0, -1) : envUrl;
  }
  return '/api/v1';
};

class ApiClient {
  private get fullBaseUrl(): string {
    return getBaseUrl();
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

    // Ensure base URL doesn't conflict if endpoint already contains prefix
    let url: string;
    if (cleanEndpoint.startsWith('/api/v1/')) {
      url = cleanEndpoint;
    } else {
      url = `${this.fullBaseUrl}${cleanEndpoint}`;
    }

    const isFormData = options.body instanceof FormData;
    const headers: Record<string, string> = {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...(options.headers as Record<string, string>),
    };

    const token = getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    let response: Response;
    try {
      response = await fetch(url, {
        ...options,
        headers,
      });
    } catch (err: any) {
      const networkError: ApiErrorResponse = {
        error: 'NetworkError',
        message: 'Failed to connect to backend server. Please check your network connection.',
      };
      throw networkError;
    }

    let data: any;
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      try {
        data = await response.json();
      } catch {
        data = null;
      }
    }

    if (!response.ok) {
      if (response.status === 401) {
        // Dispatch custom unauthorized event for AuthContext to intercept
        window.dispatchEvent(new CustomEvent('auth:unauthorized'));
      }

      const errorPayload: ApiErrorResponse = {
        error: data?.error || 'ApiError',
        message: data?.message || `Request failed with status ${response.status}`,
        details: data?.details,
      };
      throw errorPayload;
    }

    return data as T;
  }

  public get<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  public post<T>(endpoint: string, body?: any, options: RequestInit = {}): Promise<T> {
    const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: isFormData ? body : (body ? JSON.stringify(body) : undefined),
    });
  }

  public patch<T>(endpoint: string, body?: any, options: RequestInit = {}): Promise<T> {
    const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
    return this.request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: isFormData ? body : (body ? JSON.stringify(body) : undefined),
    });
  }

  public put<T>(endpoint: string, body?: any, options: RequestInit = {}): Promise<T> {
    const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: isFormData ? body : (body ? JSON.stringify(body) : undefined),
    });
  }

  public delete<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }
}

export const apiClient = new ApiClient();

import { apiClient } from './apiClient';
import { getToken } from './auth.api';
import {
  Interview,
  InterviewFilters,
  InterviewStatus,
  UpdateInterviewInput,
  ReplaceInterviewersInput
} from '../types/hr';
import { ApiErrorResponse } from '../types/auth';

export interface InterviewsResponse {
  data: Interview[];
  count: number;
}

export interface InterviewDetailResponse {
  data: Interview;
}

export const hrInterviewsApi = {
  listInterviews: async (filters?: InterviewFilters): Promise<InterviewsResponse> => {
    const query = new URLSearchParams();
    if (filters?.applicationId) query.append('applicationId', filters.applicationId);
    if (filters?.status) query.append('status', filters.status);
    if (filters?.from) query.append('from', filters.from);
    if (filters?.to) query.append('to', filters.to);
    const queryString = query.toString();
    const endpoint = queryString ? `/interviews?${queryString}` : '/interviews';
    return apiClient.get<InterviewsResponse>(endpoint);
  },

  getInterview: async (id: string): Promise<InterviewDetailResponse> => {
    return apiClient.get<InterviewDetailResponse>(`/interviews/${id}`);
  },

  updateInterview: async (id: string, data: UpdateInterviewInput): Promise<InterviewDetailResponse> => {
    return apiClient.patch<InterviewDetailResponse>(`/interviews/${id}`, data);
  },

  updateStatus: async (id: string, status: InterviewStatus): Promise<InterviewDetailResponse> => {
    return apiClient.patch<InterviewDetailResponse>(`/interviews/${id}/status`, { status });
  },

  replaceInterviewers: async (id: string, data: ReplaceInterviewersInput): Promise<InterviewDetailResponse> => {
    const token = getToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`/api/v1/interviews/${id}/interviewers`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(data)
    });

    let resData: any = null;
    try {
      resData = await response.json();
    } catch {
      resData = null;
    }

    if (!response.ok) {
      if (response.status === 401) {
        window.dispatchEvent(new CustomEvent('auth:unauthorized'));
      }
      const errorPayload: ApiErrorResponse = {
        error: resData?.error || 'ApiError',
        message: resData?.message || `Request failed with status ${response.status}`,
        details: resData?.details
      };
      throw errorPayload;
    }

    return resData as InterviewDetailResponse;
  }
};

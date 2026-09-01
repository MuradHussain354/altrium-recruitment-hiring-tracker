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

export const normalizeInterview = (item: any): Interview => {
  if (!item || typeof item !== 'object') return item;
  const assignments = Array.isArray(item.assignments)
    ? item.assignments
    : Array.isArray(item.interviewers)
    ? item.interviewers
    : [];
  return {
    ...item,
    assignments,
    interviewers: assignments
  };
};

export const hrInterviewsApi = {
  listInterviews: async (filters?: InterviewFilters): Promise<InterviewsResponse> => {
    const query = new URLSearchParams();
    if (filters?.applicationId) query.append('applicationId', filters.applicationId);
    if (filters?.status) query.append('status', filters.status);
    if (filters?.from) query.append('from', filters.from);
    if (filters?.to) query.append('to', filters.to);
    const queryString = query.toString();
    const endpoint = queryString ? `/interviews?${queryString}` : '/interviews';
    const res = await apiClient.get<InterviewsResponse>(endpoint);
    return {
      ...res,
      data: Array.isArray(res?.data) ? res.data.map(normalizeInterview) : []
    };
  },

  getInterview: async (id: string): Promise<InterviewDetailResponse> => {
    const res = await apiClient.get<InterviewDetailResponse>(`/interviews/${id}`);
    return {
      ...res,
      data: normalizeInterview(res?.data)
    };
  },

  updateInterview: async (id: string, data: UpdateInterviewInput): Promise<InterviewDetailResponse> => {
    const res = await apiClient.patch<InterviewDetailResponse>(`/interviews/${id}`, data);
    return {
      ...res,
      data: normalizeInterview(res?.data)
    };
  },

  updateStatus: async (id: string, status: InterviewStatus): Promise<InterviewDetailResponse> => {
    const res = await apiClient.patch<InterviewDetailResponse>(`/interviews/${id}/status`, { status });
    return {
      ...res,
      data: normalizeInterview(res?.data)
    };
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

    return {
      ...resData,
      data: normalizeInterview(resData?.data)
    } as InterviewDetailResponse;
  }
};

import { apiClient } from './apiClient';
import {
  Application,
  ApplicationFilters,
  UpdateApplicationStatusInput,
  MoveStageInput,
  AssignTeamInput,
  ScheduleInterviewInput,
  Interview
} from '../types/hr';

export interface ApplicationsResponse {
  data: Application[];
  count: number;
}

export interface ApplicationDetailResponse {
  data: Application;
}

export interface ScheduleInterviewResponse {
  data: Interview;
  message?: string;
}

export const hrApplicationsApi = {
  listApplications: async (filters?: ApplicationFilters): Promise<ApplicationsResponse> => {
    const query = new URLSearchParams();
    if (filters?.positionId) query.append('positionId', filters.positionId);
    if (filters?.stageId) query.append('stageId', filters.stageId);
    if (filters?.status) query.append('status', filters.status);
    if (filters?.search) query.append('search', filters.search);
    const queryString = query.toString();
    const endpoint = queryString ? `/applications?${queryString}` : '/applications';
    return apiClient.get<ApplicationsResponse>(endpoint);
  },

  getApplication: async (id: string): Promise<ApplicationDetailResponse> => {
    return apiClient.get<ApplicationDetailResponse>(`/applications/${id}`);
  },

  updateStatus: async (id: string, data: UpdateApplicationStatusInput): Promise<ApplicationDetailResponse> => {
    return apiClient.patch<ApplicationDetailResponse>(`/applications/${id}/status`, data);
  },

  moveStage: async (id: string, data: MoveStageInput): Promise<ApplicationDetailResponse> => {
    return apiClient.patch<ApplicationDetailResponse>(`/applications/${id}/stage`, data);
  },

  assignTeam: async (id: string, data: AssignTeamInput): Promise<ApplicationDetailResponse> => {
    return apiClient.patch<ApplicationDetailResponse>(`/applications/${id}/team`, data);
  },

  scheduleInterview: async (applicationId: string, data: ScheduleInterviewInput): Promise<ScheduleInterviewResponse> => {
    const res = await apiClient.post<ScheduleInterviewResponse>(`/applications/${applicationId}/interviews`, data);
    const rawData: any = res?.data;
    const assignments = Array.isArray(rawData?.assignments)
      ? rawData.assignments
      : Array.isArray(rawData?.interviewers)
      ? rawData.interviewers
      : [];
    return {
      ...res,
      data: rawData ? { ...rawData, assignments, interviewers: assignments } : rawData
    };
  }
};

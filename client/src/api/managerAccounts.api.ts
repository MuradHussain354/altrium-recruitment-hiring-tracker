import { apiClient } from './apiClient';
import {
  EligibleUser,
  CreateUserInput,
  SafeUserProfile,
  TeamOption
} from '../types/manager';

export interface EligibleUsersResponse {
  data: EligibleUser[];
  count: number;
}

export interface UserMutationResponse {
  message: string;
  user: SafeUserProfile;
}

export interface TeamsListResponse {
  data: TeamOption[];
  count: number;
}

export const managerAccountsApi = {
  listManagedUsers: async (): Promise<EligibleUsersResponse> => {
    return apiClient.get<EligibleUsersResponse>('/users');
  },

  listEligibleUsers: async (): Promise<EligibleUsersResponse> => {
    return apiClient.get<EligibleUsersResponse>('/users/interviewers');
  },

  createUser: async (data: CreateUserInput): Promise<UserMutationResponse> => {
    return apiClient.post<UserMutationResponse>('/users', data);
  },

  setUserStatus: async (userId: string, isActive: boolean): Promise<UserMutationResponse> => {
    return apiClient.patch<UserMutationResponse>(`/users/${userId}/status`, { isActive });
  },

  resendInvitation: async (userId: string): Promise<{ message: string }> => {
    return apiClient.post<{ message: string }>(`/users/${userId}/resend-invitation`, {});
  },

  listTeams: async (): Promise<TeamsListResponse> => {
    return apiClient.get<TeamsListResponse>('/teams');
  }
};

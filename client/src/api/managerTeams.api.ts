import { apiClient } from './apiClient';
import { TeamOption } from '../types/manager';

export interface TeamsListResponse {
  data: TeamOption[];
  count: number;
}

export interface CreateTeamResponse {
  message: string;
  data: TeamOption;
}

export interface CreateTeamInput {
  name: string;
}

export const managerTeamsApi = {
  listTeams: async (): Promise<TeamsListResponse> => {
    return apiClient.get<TeamsListResponse>('/teams');
  },

  createTeam: async (data: CreateTeamInput): Promise<CreateTeamResponse> => {
    return apiClient.post<CreateTeamResponse>('/teams', data);
  }
};

import { apiClient } from './apiClient';
import { TeamLookupItem, EligibleInterviewerItem } from '../types/hr';

export interface TeamsLookupResponse {
  data: TeamLookupItem[];
  count: number;
}

export interface InterviewersLookupResponse {
  data: EligibleInterviewerItem[];
  count: number;
}

export const hrLookupsApi = {
  listTeams: async (): Promise<TeamsLookupResponse> => {
    return apiClient.get<TeamsLookupResponse>('/teams');
  },

  listEligibleInterviewers: async (): Promise<InterviewersLookupResponse> => {
    return apiClient.get<InterviewersLookupResponse>('/users/interviewers');
  }
};

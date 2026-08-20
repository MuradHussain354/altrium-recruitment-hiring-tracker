import { apiClient } from './apiClient';
import { TLInterviewListItem, TLInterviewDetail } from '../types/teamlead';

export interface InterviewsListResponse {
  data: TLInterviewListItem[];
  count: number;
}

export interface InterviewDetailResponse {
  data: TLInterviewDetail;
}

export const teamLeadInterviewsApi = {
  listMyInterviews: async (params?: {
    applicationId?: string;
    status?: 'Scheduled' | 'Completed' | 'Cancelled' | '';
    from?: string;
    to?: string;
  }): Promise<InterviewsListResponse> => {
    const query = new URLSearchParams();
    if (params?.applicationId) query.append('applicationId', params.applicationId);
    if (params?.status) query.append('status', params.status);
    if (params?.from) query.append('from', params.from);
    if (params?.to) query.append('to', params.to);

    const queryString = query.toString();
    const endpoint = queryString ? `/interviews?${queryString}` : '/interviews';
    return apiClient.get<InterviewsListResponse>(endpoint);
  },

  getMyInterview: async (interviewId: string): Promise<InterviewDetailResponse> => {
    return apiClient.get<InterviewDetailResponse>(`/interviews/${interviewId}`);
  }
};

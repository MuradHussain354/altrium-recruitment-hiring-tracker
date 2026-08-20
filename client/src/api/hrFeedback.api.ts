import { apiClient } from './apiClient';
import { FeedbackItem } from '../types/hr';

export interface FeedbackListResponse {
  data: FeedbackItem[];
  count: number;
}

export const hrFeedbackApi = {
  getInterviewFeedback: async (interviewId: string): Promise<FeedbackListResponse> => {
    return apiClient.get<FeedbackListResponse>(`/interviews/${interviewId}/feedback`);
  }
};

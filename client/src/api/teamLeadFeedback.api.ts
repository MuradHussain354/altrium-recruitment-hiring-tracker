import { apiClient } from './apiClient';
import { TLFeedbackItem, SubmitFeedbackInput } from '../types/teamlead';

export interface SubmitFeedbackResponse {
  message: string;
  data: TLFeedbackItem;
}

export interface FeedbackListResponse {
  data: TLFeedbackItem[];
  count: number;
}

export const teamLeadFeedbackApi = {
  submitFeedback: async (
    interviewId: string,
    data: SubmitFeedbackInput
  ): Promise<SubmitFeedbackResponse> => {
    return apiClient.post<SubmitFeedbackResponse>(`/interviews/${interviewId}/feedback`, data);
  },

  getMyFeedback: async (interviewId: string): Promise<FeedbackListResponse> => {
    return apiClient.get<FeedbackListResponse>(`/interviews/${interviewId}/feedback`);
  }
};

export interface TLInterviewListItem {
  id: string;
  applicationId: string;
  stageId: string;
  scheduledAt: string | null;
  location: string | null;
  meetingLink: string | null;
  status: 'Scheduled' | 'Completed' | 'Cancelled';
  application: {
    id: string;
    status: string;
    candidate: {
      id: string;
      name: string;
    };
    position: {
      id: string;
      title: string;
      department: string;
    };
  };
  stage: {
    id: string;
    name: string;
    sequenceOrder: number;
  };
  assignments: Array<{
    id: string;
    assignedAt: string;
    interviewer: {
      id: string;
      name: string;
      role: string;
    };
  }>;
}

export interface TLInterviewDetail {
  id: string;
  applicationId: string;
  stageId: string;
  scheduledAt: string | null;
  location: string | null;
  meetingLink: string | null;
  status: 'Scheduled' | 'Completed' | 'Cancelled';
  application: {
    id: string;
    status: string;
    statusReason: string | null;
    currentStageId: string;
    candidate: {
      id: string;
      name: string;
      email: string;
      phone: string | null;
    };
    position: {
      id: string;
      title: string;
      department: string;
    };
  };
  stage: {
    id: string;
    name: string;
    sequenceOrder: number;
    isGating: boolean;
  };
  assignments: Array<{
    id: string;
    feedbackSubmitted: boolean;
    invitationStatus?: 'Pending' | 'Accepted' | 'Declined';
    declineReason?: string | null;
    delegatedToId?: string | null;
    assignedAt: string;
    interviewer: {
      id: string;
      name: string;
      role: string;
    };
  }>;
  questionSetId?: string | null;
  questionSet?: {
    id: string;
    title: string;
    description?: string | null;
    category: string;
    questions?: Array<{
      id?: string;
      questionText: string;
      sequenceOrder: number;
      guidance?: string | null;
    }>;
  } | null;
}

export interface FeedbackCriterionScore {
  id: string;
  criterionName: string;
  weight: number;
  score: number;
}

export interface TLFeedbackItem {
  id: string;
  interviewId: string;
  interviewerId: string;
  overallRating: number | null;
  comments: string | null;
  submittedAt: string;
  interviewer: {
    id: string;
    name: string;
    role: string;
  };
  criterionScores: FeedbackCriterionScore[];
}

export interface FeedbackCriterionInput {
  criterionName: string;
  weight?: number;
  score: number;
}

export interface SubmitFeedbackInput {
  overallRating?: number;
  comments?: string;
  criterionScores?: FeedbackCriterionInput[];
}

export interface NotificationItem {
  id: string;
  applicationId: string | null;
  interviewId?: string | null;
  recipientType: string;
  recipientId: string;
  type: string;
  channel: string;
  isRead: boolean;
  readAt?: string | null;
  sentAt: string;
}

export interface ListNotificationsParams {
  type?: string;
  limit?: number;
  offset?: number;
}

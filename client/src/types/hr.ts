export type PositionStatus = 'Draft' | 'Open' | 'OnHold' | 'Closed';
export type ApplicationStatus = 'InProgress' | 'Hired' | 'Rejected' | 'OnHold';
export type InterviewStatus = 'Scheduled' | 'Completed' | 'Cancelled';
export type UserRole = 'Manager' | 'HR' | 'TeamLead';

export interface Position {
  id: string;
  title: string;
  department: string;
  description: string;
  requiredSkills?: string | null;
  headcount: number;
  status: PositionStatus;
  createdById?: string;
  createdAt: string;
  updatedAt: string;
  _count?: {
    stages?: number;
    applications?: number;
  };
}

export interface CreatePositionInput {
  title: string;
  department: string;
  description: string;
  requiredSkills?: string;
  headcount?: number;
  status?: 'Draft' | 'Open';
}

export interface UpdatePositionInput {
  title?: string;
  department?: string;
  description?: string;
  requiredSkills?: string;
  headcount?: number;
}

export interface Stage {
  id: string;
  positionId: string;
  name: string;
  sequenceOrder: number;
  isGating: boolean;
  feedbackRequiredCount: number;
}

export interface CreateStageInput {
  name: string;
  sequenceOrder?: number;
  isGating?: boolean;
  feedbackRequiredCount?: number;
}

export interface UpdateStageInput {
  name?: string;
  isGating?: boolean;
  feedbackRequiredCount?: number;
}

export interface ReorderStageItem {
  stageId: string;
  sequenceOrder: number;
}

export interface Candidate {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  resumeUrl?: string | null;
  source?: string | null;
  createdAt?: string;
}

export interface Application {
  id: string;
  candidateId: string;
  positionId: string;
  currentStageId: string;
  assignedTeamId: string | null;
  status: ApplicationStatus;
  statusReason?: string | null;
  createdAt: string;
  updatedAt: string;
  candidate: Candidate;
  position: {
    id: string;
    title: string;
    department: string;
    description?: string;
  };
  currentStage: Stage;
  assignedTeam?: {
    id: string;
    name: string;
  } | null;
}

export interface ApplicationFilters {
  positionId?: string;
  stageId?: string;
  status?: ApplicationStatus | '';
  search?: string;
}

export interface UpdateApplicationStatusInput {
  status: ApplicationStatus;
  statusReason?: string;
}

export interface MoveStageInput {
  stageId: string;
}

export interface AssignTeamInput {
  teamId: string;
}

export interface TeamLookupItem {
  id: string;
  name: string;
}

export interface EligibleInterviewerItem {
  id: string;
  name: string;
  email: string;
  role: 'HR' | 'TeamLead';
  isActive: boolean;
  teamId: string | null;
}

export interface InterviewerAssignment {
  id: string;
  interviewId: string;
  interviewerId: string;
  feedbackSubmitted: boolean;
  invitationStatus?: 'PENDING' | 'ACCEPTED' | 'DECLINED' | string;
  declineReason?: string | null;
  respondedAt?: string | null;
  assignedAt?: string;
  interviewer: {
    id: string;
    name: string;
    email: string;
    role: UserRole;
  };
  delegatedTo?: {
    id: string;
    name: string;
    role: UserRole;
  } | null;
}

export interface Interview {
  id: string;
  applicationId: string;
  stageId: string;
  scheduledAt: string;
  location?: string | null;
  meetingLink?: string | null;
  status: InterviewStatus;
  questionSetId?: string | null;
  questionSet?: QuestionSet | null;
  createdById?: string;
  createdAt: string;
  updatedAt: string;
  application?: {
    id: string;
    candidate?: {
      id: string;
      name: string;
      email: string;
      phone?: string | null;
    };
    position?: {
      id: string;
      title: string;
      department: string;
    };
  };
  stage?: {
    id: string;
    name: string;
    sequenceOrder: number;
    isGating?: boolean;
  };
  assignments?: InterviewerAssignment[];
  interviewers?: InterviewerAssignment[];
}

export interface InterviewFilters {
  applicationId?: string;
  status?: InterviewStatus | '';
  from?: string;
  to?: string;
}

export interface ScheduleInterviewInput {
  stageId: string;
  scheduledAt: string;
  location?: string;
  meetingLink?: string;
  interviewerIds: string[];
  questionSetId?: string | null;
}

export interface UpdateInterviewInput {
  scheduledAt?: string;
  location?: string;
  meetingLink?: string;
  questionSetId?: string | null;
}

export interface UpdateInterviewStatusInput {
  status: InterviewStatus;
}

export interface ReplaceInterviewersInput {
  interviewerIds: string[];
}

export interface FeedbackCriterionScore {
  id?: string;
  criterionName: string;
  weight: number | string;
  score: number | string;
}

export interface FeedbackItem {
  id: string;
  interviewId: string;
  interviewerId: string;
  overallRating: number | string;
  comments: string;
  submittedAt: string;
  interviewer: {
    id: string;
    name: string;
    email: string;
    role: UserRole;
  };
  criteriaScores: FeedbackCriterionScore[];
}

// ── SPRINT 2 BATCH 2 TYPES ──────────────────────────────────────────────────

export interface ApplicationInternalNote {
  id: string;
  applicationId: string;
  authorId: string;
  content: string;
  createdAt: string;
  author: {
    id: string;
    name: string;
    role: UserRole;
  };
}

export interface ApplicationTag {
  id: string;
  applicationId: string;
  name: string;
  color: string;
  createdAt: string;
}

export interface ApplicationComment {
  id: string;
  applicationId: string;
  authorId: string;
  content: string;
  createdAt: string;
  author: {
    id: string;
    name: string;
    role: UserRole;
  };
  mentions?: {
    user: {
      id: string;
      name: string;
    };
  }[];
}

export interface SavedFilter {
  id: string;
  userId: string;
  name: string;
  filterData: Record<string, any>;
  createdAt: string;
}

export interface Question {
  id?: string;
  questionText: string;
  sequenceOrder: number;
  guidance?: string | null;
}

export interface QuestionSet {
  id: string;
  title: string;
  description?: string | null;
  category: string;
  createdAt: string;
  isUsedByInterviews?: boolean;
  questionCount?: number;
  questions?: Question[];
  createdBy?: {
    id: string;
    name: string;
  };
}

export interface ConsolidatedFeedbackScorecard {
  summary: {
    totalInterviews: number;
    totalFeedbacks: number;
    overallWeightedScore: number | null;
  };
  interviews: {
    id: string;
    scheduledAt: string | null;
    stageName: string;
    interviewsCount: number;
    feedbacks: {
      id: string;
      interviewerName: string;
      interviewerRole: string;
      submittedAt: string;
      overallRating: number | null;
      comments: string | null;
      criterionScores: {
        criterionName: string;
        weight: number;
        score: number;
      }[];
    }[];
  }[];
  aggregatedCriteria: {
    criterionName: string;
    averageScore: number;
    averageWeight: number;
    count: number;
  }[];
}

export interface CrossTeamAnalytics {
  comparative: {
    department: string;
    positionCount: number;
    applicationCount: number;
    interviewCount: number;
    hiredCount: number;
    offerApprovedCount: number;
    rejectedCount: number;
    avgTimeToHireDays: number;
    offerAcceptanceRate: number;
  }[];
}

export interface HeadcountFulfillmentReport {
  summary: {
    totalPositions: number;
    overallTargetHeadcount: number;
    overallHired: number;
    overallOfferApproved: number;
    overallFulfillmentPercent: number;
  };
  positions: {
    positionId: string;
    title: string;
    department: string;
    status: PositionStatus;
    targetHeadcount: number;
    hiredCount: number;
    offerApprovedCount: number;
    remainingHeadcount: number;
    fulfillmentPercent: number;
  }[];
}

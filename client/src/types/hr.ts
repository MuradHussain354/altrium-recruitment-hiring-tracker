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
  interviewer: {
    id: string;
    name: string;
    email: string;
    role: UserRole;
  };
}

export interface Interview {
  id: string;
  applicationId: string;
  stageId: string;
  scheduledAt: string;
  location?: string | null;
  meetingLink?: string | null;
  status: InterviewStatus;
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
}

export interface UpdateInterviewInput {
  scheduledAt?: string;
  location?: string;
  meetingLink?: string;
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

export interface ReportFilters {
  dateFrom?: string;
  dateTo?: string;
  department?: string;
  positionId?: string;
}

export interface OverviewReport {
  positions: {
    total: number;
    byStatus: {
      Draft: number;
      Open: number;
      OnHold: number;
      Closed: number;
    };
  };
  applications: {
    total: number;
    byStatus: {
      InProgress: number;
      Hired: number;
      Rejected: number;
      OnHold: number;
    };
  };
  candidates: {
    total: number;
  };
  interviews: {
    total: number;
    byStatus: {
      Scheduled: number;
      Completed: number;
      Cancelled: number;
    };
  };
  feedback: {
    totalSubmitted: number;
  };
  upcomingInterviews: Array<{
    id: string;
    applicationId: string;
    positionTitle: string;
    stageName: string;
    scheduledAt: string | null;
    location: string | null;
    meetingLink: string | null;
    status: string;
  }>;
}

export interface PositionReportItem {
  id: string;
  title: string;
  department: string;
  status: string;
  headcount: number;
  totalApplications: number;
  inProgressApplications: number;
  hiredApplications: number;
  rejectedApplications: number;
  interviewCount: number;
}

export interface PipelineStage {
  stageId: string;
  stageName: string;
  sequenceOrder: number;
  applicationCount: number;
}

export interface PipelineReportItem {
  positionId: string;
  positionTitle: string;
  department: string;
  status: string;
  totalApplications: number;
  stages: PipelineStage[];
}

export interface InterviewReportItem {
  id: string;
  applicationId: string;
  positionId: string;
  positionTitle: string;
  department: string;
  stageId: string;
  stageName: string;
  scheduledAt: string | null;
  location: string | null;
  meetingLink: string | null;
  status: string;
  interviewerCount: number;
}

export interface InterviewsReport {
  total: number;
  byStatus: {
    Scheduled: number;
    Completed: number;
    Cancelled: number;
  };
  interviews: InterviewReportItem[];
}

export interface TeamOption {
  id: string;
  name: string;
}

export interface EligibleUser {
  id: string;
  name: string;
  email: string;
  role: 'HR' | 'TeamLead' | string;
  isActive: boolean;
  teamId: string | null;
}

export interface CreateUserInput {
  name: string;
  email: string;
  password: string;
  role: 'HR' | 'TeamLead';
  teamId?: string | null;
}

export interface SafeUserProfile {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  teamId: string | null;
  createdById: string | null;
  createdAt: string;
}

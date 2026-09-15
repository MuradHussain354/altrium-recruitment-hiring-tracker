// Public position as returned by GET /api/v1/public/positions and /positions/:id
export interface PublicPosition {
  id: string;
  title: string;
  department: string;
  description: string;
  requiredSkills: string | null;
  headcount: number;
  createdAt: string; // ISO 8601
}

// Backend envelope: GET /api/v1/public/positions
export interface PublicPositionsResponse {
  data: PublicPosition[];
  count: number;
}

// Backend envelope: GET /api/v1/public/positions/:id
export interface PublicPositionDetailResponse {
  data: PublicPosition;
}

// Server-side query params supported by the backend
export interface PublicPositionFilters {
  search?: string;
  department?: string;
}

// Application form input — what client passes to submitApplication
export interface PublicApplicationInput {
  name: string;
  email: string;
  phone?: string;
  linkedInUrl?: string;
  notes?: string;
  resume?: File;
  resumeUrl?: string;
  positionId: string;
  // source is intentionally omitted — backend defaults to "Direct"
}

// Nested shapes inside application success response
export interface ApplicationCandidate {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  resumeUrl: string | null;
  linkedInUrl?: string | null;
  source: string;
}

export interface ApplicationPosition {
  id: string;
  title: string;
  department: string;
}

export interface ApplicationCurrentStage {
  id: string;
  name: string;
  sequenceOrder: number;
}

// Full application record returned on HTTP 201
export interface SubmittedApplication {
  id: string;
  candidateId: string;
  positionId: string;
  currentStageId: string;
  status: string;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  candidate: ApplicationCandidate;
  position: ApplicationPosition;
  currentStage: ApplicationCurrentStage;
}

// Backend envelope: POST /api/v1/public/applications (201)
export interface PublicApplicationResponse {
  message: string;
  data: SubmittedApplication;
}

// ==========================================
// TRACK MY APPLICATION TYPES
// ==========================================

export interface TrackApplicationInput {
  email: string;
  referenceId: string;
}

export interface TrackedApplication {
  referenceId: string;
  positionTitle: string;
  department: string;
  status: 'InProgress' | 'Hired' | 'Rejected' | 'OnHold' | string;
  currentStageName: string;
  currentStageSequenceOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface TrackApplicationResponse {
  message: string;
  data: TrackedApplication;
}

// ==========================================
// JOB ALERT SUBSCRIPTION TYPES
// ==========================================

export interface JobAlertSubscriptionInput {
  email: string;
  department?: string;
  keyword?: string;
}

export interface JobAlertSubscription {
  id: string;
  email: string;
  department: string | null;
  keyword: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface JobAlertSubscriptionResponse {
  message: string;
  data: JobAlertSubscription;
}

import { apiClient } from './apiClient';
import {
  PublicPositionFilters,
  PublicPositionsResponse,
  PublicPositionDetailResponse,
  PublicApplicationInput,
  PublicApplicationResponse,
  TrackApplicationInput,
  TrackApplicationResponse,
  JobAlertSubscriptionInput,
  JobAlertSubscriptionResponse,
} from '../types/careers';

/**
 * Fetch all Open positions from the public API.
 * Optionally filters by search keyword and/or department.
 * Returns the full backend envelope: { data: PublicPosition[], count: number }
 *
 * GET /api/v1/public/positions?search=...&department=...
 */
export async function getPublicPositions(
  filters?: PublicPositionFilters
): Promise<PublicPositionsResponse> {
  const params = new URLSearchParams();
  if (filters?.search && filters.search.trim() !== '') {
    params.set('search', filters.search.trim());
  }
  if (filters?.department && filters.department.trim() !== '') {
    params.set('department', filters.department.trim());
  }

  const query = params.toString();
  const endpoint = query ? `/public/positions?${query}` : '/public/positions';

  return apiClient.get<PublicPositionsResponse>(endpoint);
}

/**
 * Fetch a single Open position by UUID.
 * Returns the full backend envelope: { data: PublicPosition }
 * Throws ApiErrorResponse (with error.message) on 404 or other error.
 *
 * GET /api/v1/public/positions/:positionId
 */
export async function getPublicPosition(
  positionId: string
): Promise<PublicPositionDetailResponse> {
  return apiClient.get<PublicPositionDetailResponse>(`/public/positions/${positionId}`);
}

/**
 * Submit a candidate application for an Open position with CV file upload.
 * Returns the full backend envelope: { message: string, data: SubmittedApplication }
 * Throws ApiErrorResponse on 400, 404, 409, or network error.
 *
 * POST /api/v1/public/applications
 */
export async function submitApplication(
  input: PublicApplicationInput
): Promise<PublicApplicationResponse> {
  const formData = new FormData();
  formData.append('name', input.name);
  formData.append('email', input.email);
  formData.append('positionId', input.positionId);

  if (input.phone && input.phone.trim() !== '') {
    formData.append('phone', input.phone.trim());
  }

  if (input.linkedInUrl && input.linkedInUrl.trim() !== '') {
    formData.append('linkedInUrl', input.linkedInUrl.trim());
  }

  if (input.notes && input.notes.trim() !== '') {
    formData.append('notes', input.notes.trim());
  }

  if (input.resume) {
    formData.append('resume', input.resume);
  } else if (input.resumeUrl && input.resumeUrl.trim() !== '') {
    formData.append('resumeUrl', input.resumeUrl.trim());
  }

  return apiClient.post<PublicApplicationResponse>('/public/applications', formData);
}

/**
 * Track an existing application with email and reference ID (UUID).
 * Returns safe public snapshot only.
 * Throws 404 on mismatched credentials.
 *
 * POST /api/v1/public/applications/track
 */
export async function trackApplication(
  input: TrackApplicationInput
): Promise<TrackApplicationResponse> {
  return apiClient.post<TrackApplicationResponse>('/public/applications/track', {
    email: input.email.trim(),
    referenceId: input.referenceId.trim(),
  });
}

/**
 * Subscribe to new job openings alerts.
 *
 * POST /api/v1/public/job-alerts
 */
export async function subscribeJobAlert(
  input: JobAlertSubscriptionInput
): Promise<JobAlertSubscriptionResponse> {
  const payload: Record<string, string> = {
    email: input.email.trim(),
  };

  if (input.department && input.department.trim()) {
    payload.department = input.department.trim();
  }

  if (input.keyword && input.keyword.trim()) {
    payload.keyword = input.keyword.trim();
  }

  return apiClient.post<JobAlertSubscriptionResponse>('/public/job-alerts', payload);
}

import { apiClient } from './apiClient';
import {
  PublicPositionFilters,
  PublicPositionsResponse,
  PublicPositionDetailResponse,
  PublicApplicationInput,
  PublicApplicationResponse,
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

  if (input.resume) {
    formData.append('resume', input.resume);
  } else if (input.resumeUrl && input.resumeUrl.trim() !== '') {
    formData.append('resumeUrl', input.resumeUrl.trim());
  }

  return apiClient.post<PublicApplicationResponse>('/public/applications', formData);
}

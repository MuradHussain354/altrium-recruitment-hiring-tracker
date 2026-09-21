import { apiClient } from './apiClient';
import {
  ApplicationInternalNote,
  ApplicationTag,
  ApplicationComment,
  SavedFilter,
  QuestionSet,
  ConsolidatedFeedbackScorecard,
  CrossTeamAnalytics,
  HeadcountFulfillmentReport,
  ApplicationStatus
} from '../types/hr';

// ── BULK OPERATIONS ─────────────────────────────────────────────────────────

export const bulkChangeStatus = async (
  applicationIds: string[],
  status: ApplicationStatus,
  statusReason?: string
) => {
  const res = await apiClient.post<{ data: any }>('/applications/bulk/status', {
    applicationIds,
    status,
    statusReason
  });
  return res.data;
};

export const bulkChangeStage = async (
  applicationIds: string[],
  stageId: string
) => {
  const res = await apiClient.post<{ data: any }>('/applications/bulk/stage', {
    applicationIds,
    stageId
  });
  return res.data;
};

export const bulkAssignTeam = async (
  applicationIds: string[],
  teamId: string | null
) => {
  const res = await apiClient.post<{ data: any }>('/applications/bulk/team', {
    applicationIds,
    teamId
  });
  return res.data;
};

import { getToken } from './auth.api';

// ── EXPORT URLS & AUTHENTICATED DOWNLOADS ──────────────────────────────────

export const getExportExcelUrl = (ids?: string[]) => {
  const base = '/api/v1/applications/export/excel';
  return ids && ids.length > 0 ? `${base}?ids=${ids.join(',')}` : base;
};

export const getExportPdfUrl = (ids?: string[]) => {
  const base = '/api/v1/applications/export/pdf';
  return ids && ids.length > 0 ? `${base}?ids=${ids.join(',')}` : base;
};

export const downloadExportExcel = async (ids?: string[]): Promise<void> => {
  const url = getExportExcelUrl(ids);
  const token = getToken();
  const response = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {}
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: 'Failed to export Excel' }));
    throw new Error(errorData.message || `Export failed with status ${response.status}`);
  }
  const blob = await response.blob();
  const downloadUrl = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = downloadUrl;
  a.download = 'candidates-shortlist.xlsx';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(downloadUrl);
};

export const downloadExportPdf = async (ids?: string[]): Promise<void> => {
  const url = getExportPdfUrl(ids);
  const token = getToken();
  const response = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {}
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: 'Failed to export PDF' }));
    throw new Error(errorData.message || `Export failed with status ${response.status}`);
  }
  const blob = await response.blob();
  const downloadUrl = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = downloadUrl;
  a.download = 'candidates-shortlist.pdf';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(downloadUrl);
};

// ── INTERNAL NOTES (HR & Manager) ───────────────────────────────────────────

export const getApplicationNotes = async (applicationId: string): Promise<ApplicationInternalNote[]> => {
  const res = await apiClient.get<{ data: ApplicationInternalNote[] }>(`/applications/${applicationId}/notes`);
  return res.data;
};

export const addApplicationNote = async (
  applicationId: string,
  content: string
): Promise<ApplicationInternalNote> => {
  const res = await apiClient.post<{ data: ApplicationInternalNote }>(`/applications/${applicationId}/notes`, { content });
  return res.data;
};

export const deleteApplicationNote = async (
  applicationId: string,
  noteId: string
): Promise<{ success: boolean }> => {
  const res = await apiClient.delete<{ data: { success: boolean } }>(`/applications/${applicationId}/notes/${noteId}`);
  return res.data;
};

// ── APPLICATION TAGS ────────────────────────────────────────────────────────

export const getApplicationTags = async (applicationId: string): Promise<ApplicationTag[]> => {
  const res = await apiClient.get<{ data: ApplicationTag[] }>(`/applications/${applicationId}/tags`);
  return res.data;
};

export const addApplicationTag = async (
  applicationId: string,
  name: string,
  color: string = '#3B82F6'
): Promise<ApplicationTag> => {
  const res = await apiClient.post<{ data: ApplicationTag }>(`/applications/${applicationId}/tags`, { name, color });
  return res.data;
};

export const removeApplicationTag = async (
  applicationId: string,
  tagId: string
): Promise<{ success: boolean }> => {
  const res = await apiClient.delete<{ data: { success: boolean } }>(`/applications/${applicationId}/tags/${tagId}`);
  return res.data;
};

export const getAllDistinctTags = async (): Promise<{ name: string; color: string }[]> => {
  const res = await apiClient.get<{ data: { name: string; color: string }[] }>('/tags');
  return res.data;
};

// ── APPLICATION COMMENTS & @mentions ────────────────────────────────────────

export const getApplicationComments = async (applicationId: string): Promise<ApplicationComment[]> => {
  const res = await apiClient.get<{ data: ApplicationComment[] }>(`/applications/${applicationId}/comments`);
  return res.data;
};

export const addApplicationComment = async (
  applicationId: string,
  content: string
): Promise<ApplicationComment> => {
  const res = await apiClient.post<{ data: ApplicationComment }>(`/applications/${applicationId}/comments`, { content });
  return res.data;
};

export const deleteApplicationComment = async (
  applicationId: string,
  commentId: string
): Promise<{ success: boolean }> => {
  const res = await apiClient.delete<{ data: { success: boolean } }>(`/applications/${applicationId}/comments/${commentId}`);
  return res.data;
};

// ── SAVED FILTERS ───────────────────────────────────────────────────────────

export const getMySavedFilters = async (): Promise<SavedFilter[]> => {
  const res = await apiClient.get<{ data: SavedFilter[] }>('/saved-filters');
  return res.data;
};

export const createSavedFilter = async (
  name: string,
  filterData: Record<string, any>
): Promise<SavedFilter> => {
  const res = await apiClient.post<{ data: SavedFilter }>('/saved-filters', { name, filterData });
  return res.data;
};

export const updateSavedFilter = async (
  filterId: string,
  data: { name?: string; filterData?: Record<string, any> }
): Promise<SavedFilter> => {
  const res = await apiClient.put<{ data: SavedFilter }>(`/saved-filters/${filterId}`, data);
  return res.data;
};

export const deleteSavedFilter = async (filterId: string): Promise<{ success: boolean }> => {
  const res = await apiClient.delete<{ data: { success: boolean } }>(`/saved-filters/${filterId}`);
  return res.data;
};

// ── QUESTION SETS ───────────────────────────────────────────────────────────

export const getQuestionSets = async (category?: string): Promise<QuestionSet[]> => {
  const endpoint = category ? `/question-sets?category=${encodeURIComponent(category)}` : '/question-sets';
  const res = await apiClient.get<{ data: QuestionSet[] }>(endpoint);
  return res.data;
};

export const getQuestionSetById = async (id: string): Promise<QuestionSet> => {
  const res = await apiClient.get<{ data: QuestionSet }>(`/question-sets/${id}`);
  return res.data;
};

export const createQuestionSet = async (data: {
  title: string;
  description?: string;
  category?: string;
  questions: { questionText: string; sequenceOrder?: number; guidance?: string }[];
}): Promise<QuestionSet> => {
  const res = await apiClient.post<{ data: QuestionSet }>('/question-sets', data);
  return res.data;
};

export const updateQuestionSet = async (
  id: string,
  data: {
    title?: string;
    description?: string;
    category?: string;
    questions?: { questionText: string; sequenceOrder?: number; guidance?: string }[];
  }
): Promise<QuestionSet> => {
  const res = await apiClient.put<{ data: QuestionSet }>(`/question-sets/${id}`, data);
  return res.data;
};

export const duplicateQuestionSet = async (
  id: string,
  newTitle?: string
): Promise<QuestionSet> => {
  const res = await apiClient.post<{ data: QuestionSet }>(`/question-sets/${id}/duplicate`, { title: newTitle });
  return res.data;
};

export const deleteQuestionSet = async (id: string): Promise<{ success: boolean }> => {
  const res = await apiClient.delete<{ data: { success: boolean } }>(`/question-sets/${id}`);
  return res.data;
};

// ── CONSOLIDATED FEEDBACK ───────────────────────────────────────────────────

export const getConsolidatedFeedback = async (
  applicationId: string
): Promise<ConsolidatedFeedbackScorecard> => {
  const res = await apiClient.get<{ data: ConsolidatedFeedbackScorecard }>(`/applications/${applicationId}/consolidated-feedback`);
  return res.data;
};

// ── OFFER APPROVAL ──────────────────────────────────────────────────────────

export const requestOfferApproval = async (
  applicationId: string,
  data: { salaryOffered?: number; startDate?: string; notes?: string }
) => {
  const res = await apiClient.post<{ data: any }>(`/applications/${applicationId}/offer/request`, data);
  return res.data;
};

export const decideOfferApproval = async (
  applicationId: string,
  data: { decision: 'Approved' | 'Rejected'; notes?: string }
) => {
  const res = await apiClient.post<{ data: any }>(`/applications/${applicationId}/offer/decide`, data);
  return res.data;
};

// ── GLOBAL SEARCH ───────────────────────────────────────────────────────────

export interface SearchResultItem {
  id: string;
  type: 'candidate' | 'position' | 'application' | 'interview' | 'team';
  title: string;
  subtitle: string;
  badge?: string;
  url: string;
}

export const quickSearch = async (
  q: string,
  type: string = 'all'
): Promise<SearchResultItem[]> => {
  const query = new URLSearchParams({ q, type });
  const res = await apiClient.get<{ data: SearchResultItem[] }>(`/search?${query.toString()}`);
  return res.data;
};

// ── TEAM LEAD ACTIONS ───────────────────────────────────────────────────────

export const respondToInvitation = async (
  interviewId: string,
  status: 'Accepted' | 'Declined',
  declineReason?: string
) => {
  const res = await apiClient.post<{ data: any }>(`/interviews/${interviewId}/respond`, {
    status,
    declineReason
  });
  return res.data;
};

export const delegateInterview = async (
  interviewId: string,
  targetInterviewerId: string
) => {
  const res = await apiClient.post<{ data: any }>(`/interviews/${interviewId}/delegate`, {
    targetInterviewerId
  });
  return res.data;
};

export const getMyInterviewHistory = async (filters?: {
  status?: string;
  from?: string;
  to?: string;
}) => {
  const query = new URLSearchParams();
  if (filters?.status) query.append('status', filters.status);
  if (filters?.from) query.append('from', filters.from);
  if (filters?.to) query.append('to', filters.to);
  const qStr = query.toString();
  const endpoint = qStr ? `/interviews/my-history?${qStr}` : '/interviews/my-history';
  const res = await apiClient.get<{ data: any[] }>(endpoint);
  return res.data;
};

// ── MANAGER COMPARATIVE & HEADCOUNT REPORTS ─────────────────────────────────

export const getCrossTeamAnalytics = async (): Promise<CrossTeamAnalytics> => {
  const res = await apiClient.get<{ data: CrossTeamAnalytics }>('/reports/cross-team');
  return res.data;
};

export const getHeadcountFulfillmentReport = async (): Promise<HeadcountFulfillmentReport> => {
  const res = await apiClient.get<{ data: HeadcountFulfillmentReport }>('/reports/headcount-fulfillment');
  return res.data;
};

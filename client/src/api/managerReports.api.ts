import { apiClient } from './apiClient';
import {
  ReportFilters,
  OverviewReport,
  PositionReportItem,
  PipelineReportItem,
  InterviewsReport
} from '../types/manager';

export interface OverviewReportResponse {
  data: OverviewReport;
}

export interface PositionsReportResponse {
  data: PositionReportItem[];
  count: number;
}

export interface PipelineReportResponse {
  data: PipelineReportItem[];
  count: number;
}

export interface InterviewsReportResponse {
  data: InterviewsReport;
}

const buildQueryString = (filters?: ReportFilters): string => {
  if (!filters) return '';
  const query = new URLSearchParams();
  if (filters.dateFrom) query.append('dateFrom', filters.dateFrom);
  if (filters.dateTo) query.append('dateTo', filters.dateTo);
  if (filters.department) query.append('department', filters.department);
  if (filters.positionId) query.append('positionId', filters.positionId);
  return query.toString();
};

export const managerReportsApi = {
  getOverviewReport: async (filters?: ReportFilters): Promise<OverviewReportResponse> => {
    const qs = buildQueryString(filters);
    const endpoint = qs ? `/reports/overview?${qs}` : '/reports/overview';
    return apiClient.get<OverviewReportResponse>(endpoint);
  },

  getPositionsReport: async (filters?: ReportFilters): Promise<PositionsReportResponse> => {
    const qs = buildQueryString(filters);
    const endpoint = qs ? `/reports/positions?${qs}` : '/reports/positions';
    return apiClient.get<PositionsReportResponse>(endpoint);
  },

  getPipelineReport: async (filters?: ReportFilters): Promise<PipelineReportResponse> => {
    const qs = buildQueryString(filters);
    const endpoint = qs ? `/reports/pipeline?${qs}` : '/reports/pipeline';
    return apiClient.get<PipelineReportResponse>(endpoint);
  },

  getInterviewsReport: async (filters?: ReportFilters): Promise<InterviewsReportResponse> => {
    const qs = buildQueryString(filters);
    const endpoint = qs ? `/reports/interviews?${qs}` : '/reports/interviews';
    return apiClient.get<InterviewsReportResponse>(endpoint);
  }
};

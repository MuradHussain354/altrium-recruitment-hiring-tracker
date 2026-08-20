import { apiClient } from './apiClient';
import {
  Position,
  PositionStatus,
  CreatePositionInput,
  UpdatePositionInput,
  Stage,
  CreateStageInput,
  UpdateStageInput,
  ReorderStageItem
} from '../types/hr';

export interface PositionsResponse {
  data: Position[];
  count: number;
}

export interface PositionDetailResponse {
  data: Position;
}

export interface StagesResponse {
  data: Stage[];
  count: number;
}

export interface StageDetailResponse {
  data: Stage;
}

export const hrPositionsApi = {
  listPositions: async (params?: { department?: string; status?: PositionStatus | '' }): Promise<PositionsResponse> => {
    const query = new URLSearchParams();
    if (params?.department) query.append('department', params.department);
    if (params?.status) query.append('status', params.status);
    const queryString = query.toString();
    const endpoint = queryString ? `/positions?${queryString}` : '/positions';
    return apiClient.get<PositionsResponse>(endpoint);
  },

  getPosition: async (id: string): Promise<PositionDetailResponse> => {
    return apiClient.get<PositionDetailResponse>(`/positions/${id}`);
  },

  createPosition: async (data: CreatePositionInput): Promise<PositionDetailResponse> => {
    return apiClient.post<PositionDetailResponse>('/positions', data);
  },

  updatePosition: async (id: string, data: UpdatePositionInput): Promise<PositionDetailResponse> => {
    return apiClient.patch<PositionDetailResponse>(`/positions/${id}`, data);
  },

  updatePositionStatus: async (id: string, status: PositionStatus): Promise<PositionDetailResponse> => {
    return apiClient.patch<PositionDetailResponse>(`/positions/${id}/status`, { status });
  },

  listStages: async (positionId: string): Promise<StagesResponse> => {
    return apiClient.get<StagesResponse>(`/positions/${positionId}/stages`);
  },

  createStage: async (positionId: string, data: CreateStageInput): Promise<StageDetailResponse> => {
    return apiClient.post<StageDetailResponse>(`/positions/${positionId}/stages`, data);
  },

  updateStage: async (positionId: string, stageId: string, data: UpdateStageInput): Promise<StageDetailResponse> => {
    return apiClient.patch<StageDetailResponse>(`/positions/${positionId}/stages/${stageId}`, data);
  },

  reorderStages: async (positionId: string, stages: ReorderStageItem[]): Promise<StagesResponse> => {
    return apiClient.patch<StagesResponse>(`/positions/${positionId}/stages/reorder`, { stages });
  }
};

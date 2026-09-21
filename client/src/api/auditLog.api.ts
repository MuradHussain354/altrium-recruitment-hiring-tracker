import { apiClient } from './apiClient';

// ─── Audit Log Types ──────────────────────────────────────────────────────────

export interface AuditLogActor {
  id: string;
  name: string;
  email: string;
  role: string;
}

export interface AuditLogEntry {
  id: string;
  actorId: string | null;
  actor: AuditLogActor | null;
  actionType: string;
  entityType: string;
  entityId: string;
  details: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  timestamp: string;
}

export interface AuditLogMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface AuditLogResponse {
  data: AuditLogEntry[];
  meta: AuditLogMeta;
}

export interface AuditLogFilters {
  page?: number;
  limit?: number;
  actionType?: string;
  actorId?: string;
  search?: string;
  from?: string;
  to?: string;
}

// ─── API Call ─────────────────────────────────────────────────────────────────

/**
 * GET /api/v1/audit-logs — Manager only.
 * Returns paginated, filterable access log entries.
 */
export const getAuditLogsApi = async (filters: AuditLogFilters = {}): Promise<AuditLogResponse> => {
  const params = new URLSearchParams();
  if (filters.page)       params.set('page',       String(filters.page));
  if (filters.limit)      params.set('limit',      String(filters.limit));
  if (filters.actionType) params.set('actionType', filters.actionType);
  if (filters.actorId)    params.set('actorId',    filters.actorId);
  if (filters.search)     params.set('search',     filters.search);
  if (filters.from)       params.set('from',       filters.from);
  if (filters.to)         params.set('to',         filters.to);

  const qs = params.toString();
  return apiClient.get<AuditLogResponse>(`/audit-logs${qs ? `?${qs}` : ''}`);
};

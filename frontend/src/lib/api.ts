import type {
  Source,
  Post,
  PostListResponse,
  TopicSet,
  IngestionRun,
  Alert,
  AlertEvent,
  AuditLogEntry,
  StorageStats,
} from './types';

class ApiError extends Error {
  status: number;
  body: unknown;

  constructor(status: number, message: string, body?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }
}

export async function apiFetch<T = unknown>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `/api${path.startsWith('/') ? path : `/${path}`}`;

  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };

  if (
    options.body &&
    typeof options.body === 'string' &&
    !headers['Content-Type']
  ) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let body: unknown;
    try {
      body = await response.json();
    } catch {
      body = await response.text();
    }
    throw new ApiError(
      response.status,
      `API error ${response.status}: ${response.statusText}`,
      body
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}

// --- Sources ---

export function getSources(): Promise<Source[]> {
  return apiFetch<Source[]>('/sources');
}

export function getSource(id: string): Promise<Source> {
  return apiFetch<Source>(`/sources/${id}`);
}

export function createSource(data: Partial<Source>): Promise<Source> {
  return apiFetch<Source>('/sources', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function updateSource(
  id: string,
  data: Partial<Source>
): Promise<Source> {
  return apiFetch<Source>(`/sources/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export function deleteSource(id: string): Promise<void> {
  return apiFetch<void>(`/sources/${id}`, {
    method: 'DELETE',
  });
}

// --- Posts ---

export function getPosts(
  params?: Record<string, string | number | boolean | undefined>
): Promise<PostListResponse> {
  const query = params
    ? '?' +
      new URLSearchParams(
        Object.entries(params)
          .filter(([, v]) => v !== undefined && v !== '')
          .map(([k, v]) => [k, String(v)])
      ).toString()
    : '';
  return apiFetch<PostListResponse>(`/posts${query}`);
}

export function getPost(id: string): Promise<Post> {
  return apiFetch<Post>(`/posts/${id}`);
}

export function deletePost(id: string): Promise<void> {
  return apiFetch<void>(`/posts/${id}`, {
    method: 'DELETE',
  });
}

// --- Topic Sets ---

export function getSets(): Promise<TopicSet[]> {
  return apiFetch<TopicSet[]>('/sets');
}

export function getSet(id: string): Promise<TopicSet> {
  return apiFetch<TopicSet>(`/sets/${id}`);
}

export function createSet(data: Partial<TopicSet>): Promise<TopicSet> {
  return apiFetch<TopicSet>('/sets', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function updateSet(
  id: string,
  data: Partial<TopicSet>
): Promise<TopicSet> {
  return apiFetch<TopicSet>(`/sets/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export function deleteSet(id: string): Promise<void> {
  return apiFetch<void>(`/sets/${id}`, {
    method: 'DELETE',
  });
}

// --- Ingestion Runs ---

export function getRuns(): Promise<IngestionRun[]> {
  return apiFetch<IngestionRun[]>('/ingest/runs');
}

export function getRun(id: string): Promise<IngestionRun> {
  return apiFetch<IngestionRun>(`/ingest/runs/${id}`);
}

export function triggerIngestion(data: {
  source_id?: string;
  platform?: string;
}): Promise<IngestionRun> {
  return apiFetch<IngestionRun>('/ingest/trigger', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// --- Alerts ---

export function getAlerts(): Promise<Alert[]> {
  return apiFetch<Alert[]>('/alerts');
}

export function getAlert(id: string): Promise<Alert> {
  return apiFetch<Alert>(`/alerts/${id}`);
}

export function createAlert(data: Partial<Alert>): Promise<Alert> {
  return apiFetch<Alert>('/alerts', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function updateAlert(
  id: string,
  data: Partial<Alert>
): Promise<Alert> {
  return apiFetch<Alert>(`/alerts/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export function deleteAlert(id: string): Promise<void> {
  return apiFetch<void>(`/alerts/${id}`, {
    method: 'DELETE',
  });
}

export function getAlertEvents(alertId?: string): Promise<AlertEvent[]> {
  const path = alertId
    ? `/alerts/${alertId}/events`
    : '/alerts/events';
  return apiFetch<AlertEvent[]>(path);
}

// --- Timeline ---

export interface TimelinePost {
  id: string;
  platform: string;
  post_url: string;
  text_content: string | null;
  post_timestamp: string | null;
  engagement: Record<string, number>;
  source_username: string | null;
  source_avatar_url: string | null;
  has_media: boolean;
  media_count: number;
}

export function getTimeline(
  params?: Record<string, string | number | undefined>
): Promise<TimelinePost[]> {
  const query = params
    ? '?' +
      new URLSearchParams(
        Object.entries(params)
          .filter(([, v]) => v !== undefined && v !== '')
          .map(([k, v]) => [k, String(v)])
      ).toString()
    : '';
  return apiFetch<TimelinePost[]>(`/timeline${query}`);
}

// --- Storage ---

export function getStorageStats(): Promise<StorageStats> {
  return apiFetch<StorageStats>('/storage/stats');
}

// --- Audit Log ---

export function getAuditLog(
  params?: Record<string, string | number | undefined>
): Promise<{ items: AuditLogEntry[]; total: number }> {
  const query = params
    ? '?' +
      new URLSearchParams(
        Object.entries(params)
          .filter(([, v]) => v !== undefined && v !== '')
          .map(([k, v]) => [k, String(v)])
      ).toString()
    : '';
  return apiFetch<{ items: AuditLogEntry[]; total: number }>(
    `/audit${query}`
  );
}

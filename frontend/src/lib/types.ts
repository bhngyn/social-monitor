export interface Source {
  id: string;
  platform: string;
  platform_id: string;
  username: string;
  display_name: string | null;
  profile_url: string | null;
  avatar_url: string | null;
  is_active: boolean;
  poll_interval: number;
  config: Record<string, unknown> | null;
  last_polled_at: string | null;
  created_at: string;
  updated_at: string;
  post_count: number;
}

export interface MediaFile {
  id: string;
  post_id: string;
  media_type: string;
  original_url: string;
  file_path: string | null;
  file_size: number | null;
  mime_type: string | null;
  width: number | null;
  height: number | null;
  duration_secs: number | null;
  ordinal: number;
  created_at: string;
}

export interface PostNote {
  id: string;
  post_id: string;
  text: string;
  created_at: string;
  updated_at: string;
}

export interface Post {
  id: string;
  source_id: string;
  platform: string;
  platform_post_id: string;
  post_url: string;
  text_content: string | null;
  post_timestamp: string | null;
  engagement: Record<string, number>;
  platform_data: Record<string, unknown>;
  raw_metadata: Record<string, unknown>;
  media_downloaded: boolean;
  mhtml_captured: boolean;
  screenshot_captured: boolean;
  hashes_computed: boolean;
  mhtml_path: string | null;
  screenshot_path: string | null;
  created_at: string;
  updated_at: string;
  source_username: string | null;
  source_platform: string | null;
  media_files: MediaFile[];
  set_ids: string[];
  notes_count: number;
}

export interface PostListResponse {
  items: Post[];
  total: number;
  page: number;
  per_page: number;
}

export interface TopicSet {
  id: string;
  name: string;
  description: string | null;
  color: string;
  created_at: string;
  updated_at: string;
  post_count: number;
}

export interface SetMembership {
  id: string;
  set_id: string;
  post_id: string;
  note: string | null;
  added_at: string;
}

export interface IngestionRun {
  id: string;
  source_id: string | null;
  trigger_type: string;
  status: string;
  apify_run_id: string | null;
  posts_found: number;
  posts_new: number;
  errors: unknown[];
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}

export interface Alert {
  id: string;
  name: string;
  keyword_pattern: string;
  source_ids: string[] | null;
  platform_filter: string[] | null;
  notify_via: string;
  webhook_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  event_count: number;
}

export interface AlertEvent {
  id: string;
  alert_id: string;
  post_id: string;
  triggered_at: string;
}

export interface AuditLogEntry {
  id: string;
  event_type: string;
  entity_type: string;
  entity_id: string;
  details: Record<string, unknown>;
  timestamp: string;
}

export interface StorageStats {
  total_bytes: number;
  free_bytes: number;
  used_bytes: number;
  archive_bytes: number;
  breakdown: Record<string, unknown>;
  per_source: Array<{ source_id: string; username: string; platform: string; bytes: number }>;
}

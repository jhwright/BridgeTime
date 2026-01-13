export interface Employee {
  id: number;
  gusto_id: string | null;
  first_name: string;
  last_name: string;
  full_name: string;
  email: string;
  is_active: boolean;
  has_pin: boolean;
}

export interface JobCode {
  id: number;
  name: string;
  alias: string;
  is_active: boolean;
}

export interface JobCodeCategory {
  id: number;
  name: string;
  alias: string;
  is_active: boolean;
  job_codes: JobCode[];
}

// Role is an alias for JobCodeCategory in the new role-based UI
export type Role = JobCodeCategory;

export interface ActivityTag {
  id: number;
  name: string;
  description: string;
  role: number | null;
  role_name: string | null;
  is_active: boolean;
  color: string;
}

export interface TimeEntry {
  id: number;
  employee: number;
  employee_name: string;
  job_category: number | null;
  job_code: number | null;
  job_display_name: string;
  start_time: string;
  end_time: string | null;
  duration_seconds: number;
  is_active: boolean;
  description: string;
  activity_tags: ActivityTag[];
  is_interruption: boolean;
  interrupted_entry: number | null;
  is_paused: boolean;
  interruption_reason: string;
  created_at: string;
  updated_at: string;
}

export interface TimeEntryPhoto {
  id: number;
  time_entry: number;
  image_url: string;
  caption: string;
  created_at: string;
}

export interface TimeEntryDetail extends TimeEntry {
  job_category_detail: JobCodeCategory | null;
  job_code_detail: JobCode | null;
  paused_entry: {
    id: number;
    job_display_name: string;
    start_time: string;
  } | null;
  photos: TimeEntryPhoto[];
}

// Session is an alias for TimeEntryDetail in the new role-based UI
export type Session = TimeEntryDetail;

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface ClockStartRequest {
  employee_id: number;
  job_category_id?: number;
  job_code_id?: number;
  description?: string;
}

export interface ClockStopRequest {
  employee_id: number;
}

export interface InterruptedStartRequest {
  employee_id: number;
  job_category_id?: number;
  job_code_id?: number;
  reason: string;
}

export interface InterruptedStopRequest {
  employee_id: number;
}

export interface CurrentEntryResponse {
  current_entry: TimeEntryDetail | null;
}

export interface InterruptedStopResponse {
  closed_interruption: TimeEntryDetail;
  resumed_entry: TimeEntryDetail | null;
}

// New session-based API types
export interface SessionStartRequest {
  role_id: number;
  job_code_id?: number;
  performer_name?: string;
  activity_tag_ids?: number[];
}

export interface SessionStopRequest {
  session_id?: number;
}

export interface SessionSwitchRequest {
  role_id: number;
  job_code_id?: number;
  performer_name?: string;
}

export interface SessionTagUpdateRequest {
  tag_ids: number[];
}

export interface SessionSwitchResponse {
  ended_sessions: TimeEntryDetail[];
  new_session: TimeEntryDetail;
}

export interface ActiveSessionResponse {
  active_session: TimeEntryDetail | null;
}

// Insights types
export interface RoleHoursData {
  role_id: number;
  role_name: string;
  total_hours: number;
  total_seconds: number;
}

export interface TagDistributionData {
  id: number;
  name: string;
  color: string;
  session_count: number;
}

export interface InsightsRoleHoursResponse {
  role_hours: RoleHoursData[];
}

export interface InsightsTagDistributionResponse {
  tag_distribution: TagDistributionData[];
  sessions_without_tags: number;
  total_sessions: number;
}

export interface InsightsPatternsResponse {
  hour_distribution: { hour: number; count: number }[];
  day_distribution: { day: string; day_number: number; count: number }[];
}

// PIN authentication types
export interface VerifyPinRequest {
  employee_id: number;
  pin: string;
}

export interface VerifyPinResponse {
  valid: boolean;
  employee?: Employee;
  error?: string;
}

export interface SetPinRequest {
  pin: string;
}

export interface SetPinResponse {
  success: boolean;
  message: string;
}

// Photo upload types
export interface UploadPhotoRequest {
  time_entry: number;
  image: File;
  caption?: string;
}

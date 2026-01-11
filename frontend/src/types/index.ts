export interface Employee {
  id: number;
  gusto_id: string | null;
  first_name: string;
  last_name: string;
  full_name: string;
  email: string;
  is_active: boolean;
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
  is_interruption: boolean;
  interrupted_entry: number | null;
  is_paused: boolean;
  interruption_reason: string;
  created_at: string;
  updated_at: string;
}

export interface TimeEntryDetail extends TimeEntry {
  job_category_detail: JobCodeCategory | null;
  job_code_detail: JobCode | null;
  paused_entry: {
    id: number;
    job_display_name: string;
    start_time: string;
  } | null;
}

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

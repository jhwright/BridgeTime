import axios from 'axios';
import type {
  Employee,
  JobCodeCategory,
  TimeEntry,
  TimeEntryDetail,
  TimeEntryPhoto,
  PaginatedResponse,
  ClockStartRequest,
  ClockStopRequest,
  InterruptedStartRequest,
  InterruptedStopRequest,
  CurrentEntryResponse,
  InterruptedStopResponse,
  ActivityTag,
  SessionStartRequest,
  SessionStopRequest,
  SessionSwitchRequest,
  SessionTagUpdateRequest,
  SessionSwitchResponse,
  ActiveSessionResponse,
  InsightsRoleHoursResponse,
  InsightsTagDistributionResponse,
  InsightsPatternsResponse,
  VerifyPinRequest,
  VerifyPinResponse,
  SetPinRequest,
  SetPinResponse,
  UploadPhotoRequest,
} from '../types';

// Use relative URL in production, localhost in development
const API_BASE = import.meta.env.PROD ? '/api/v1' : 'http://localhost:8000/api/v1';

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Employees
export async function getEmployees(): Promise<Employee[]> {
  const response = await api.get<PaginatedResponse<Employee>>('/employees/');
  return response.data.results;
}

export async function getCurrentEntry(employeeId: number): Promise<TimeEntryDetail | null> {
  const response = await api.get<CurrentEntryResponse>(`/employees/${employeeId}/current_entry/`);
  return response.data.current_entry;
}

// Job Codes
export async function getJobCategories(): Promise<JobCodeCategory[]> {
  const response = await api.get<PaginatedResponse<JobCodeCategory>>('/jobs/categories/');
  return response.data.results;
}

// Clock Actions
export async function clockStart(data: ClockStartRequest): Promise<TimeEntryDetail> {
  const response = await api.post<TimeEntryDetail>('/clock/start/', data);
  return response.data;
}

export async function clockStop(data: ClockStopRequest): Promise<TimeEntryDetail> {
  const response = await api.post<TimeEntryDetail>('/clock/stop/', data);
  return response.data;
}

export async function interruptedStart(data: InterruptedStartRequest): Promise<TimeEntryDetail> {
  const response = await api.post<TimeEntryDetail>('/clock/interrupted-start/', data);
  return response.data;
}

export async function interruptedStop(data: InterruptedStopRequest): Promise<InterruptedStopResponse> {
  const response = await api.post<InterruptedStopResponse>('/clock/interrupted-stop/', data);
  return response.data;
}

// Time Entries (Admin)
export interface TimeEntryFilters {
  employee?: number;
  job_category?: number;
  start_date?: string;
  end_date?: string;
}

export async function getTimeEntries(filters?: TimeEntryFilters): Promise<TimeEntry[]> {
  const params = new URLSearchParams();
  if (filters?.employee) params.append('employee', String(filters.employee));
  if (filters?.job_category) params.append('job_category', String(filters.job_category));
  if (filters?.start_date) params.append('start_date', filters.start_date);
  if (filters?.end_date) params.append('end_date', filters.end_date);

  const response = await api.get<PaginatedResponse<TimeEntry>>(`/time-entries/?${params.toString()}`);
  return response.data.results;
}

export async function updateTimeEntry(id: number, data: Partial<TimeEntry>): Promise<TimeEntry> {
  const response = await api.patch<TimeEntry>(`/time-entries/${id}/`, data);
  return response.data;
}

export async function deleteTimeEntry(id: number): Promise<void> {
  await api.delete(`/time-entries/${id}/`);
}

// Activity Tags
export async function getActivityTags(): Promise<ActivityTag[]> {
  const response = await api.get<PaginatedResponse<ActivityTag>>('/tags/');
  return response.data.results;
}

export async function getGlobalTags(): Promise<ActivityTag[]> {
  const response = await api.get<ActivityTag[]>('/tags/global_tags/');
  return response.data;
}

export async function getTagsForRole(roleId: number): Promise<ActivityTag[]> {
  const response = await api.get<ActivityTag[]>(`/tags/for-role/${roleId}/`);
  return response.data;
}

// New Session-based API (role-based tracking)
export async function sessionStart(data: SessionStartRequest): Promise<TimeEntryDetail> {
  const response = await api.post<TimeEntryDetail>('/sessions/start/', data);
  return response.data;
}

export async function sessionStop(data: SessionStopRequest = {}): Promise<TimeEntryDetail> {
  const response = await api.post<TimeEntryDetail>('/sessions/stop/', data);
  return response.data;
}

export async function sessionSwitch(data: SessionSwitchRequest): Promise<SessionSwitchResponse> {
  const response = await api.post<SessionSwitchResponse>('/sessions/switch/', data);
  return response.data;
}

export async function updateSessionTags(sessionId: number, data: SessionTagUpdateRequest): Promise<TimeEntryDetail> {
  const response = await api.patch<TimeEntryDetail>(`/sessions/${sessionId}/tags/`, data);
  return response.data;
}

export async function getActiveSession(): Promise<TimeEntryDetail | null> {
  const response = await api.get<ActiveSessionResponse>('/sessions/active/');
  return response.data.active_session;
}

// Insights API
export interface InsightsFilters {
  start_date?: string;
  end_date?: string;
  role_id?: number;
}

export async function getInsightsRoleHours(filters?: InsightsFilters): Promise<InsightsRoleHoursResponse> {
  const params = new URLSearchParams();
  if (filters?.start_date) params.append('start_date', filters.start_date);
  if (filters?.end_date) params.append('end_date', filters.end_date);

  const response = await api.get<InsightsRoleHoursResponse>(`/insights/role-hours/?${params.toString()}`);
  return response.data;
}

export async function getInsightsTagDistribution(filters?: InsightsFilters): Promise<InsightsTagDistributionResponse> {
  const params = new URLSearchParams();
  if (filters?.start_date) params.append('start_date', filters.start_date);
  if (filters?.end_date) params.append('end_date', filters.end_date);
  if (filters?.role_id) params.append('role_id', String(filters.role_id));

  const response = await api.get<InsightsTagDistributionResponse>(`/insights/tag-distribution/?${params.toString()}`);
  return response.data;
}

export async function getInsightsPatterns(filters?: InsightsFilters): Promise<InsightsPatternsResponse> {
  const params = new URLSearchParams();
  if (filters?.start_date) params.append('start_date', filters.start_date);
  if (filters?.end_date) params.append('end_date', filters.end_date);
  if (filters?.role_id) params.append('role_id', String(filters.role_id));

  const response = await api.get<InsightsPatternsResponse>(`/insights/patterns/?${params.toString()}`);
  return response.data;
}

// PIN Authentication
export async function verifyPin(data: VerifyPinRequest): Promise<VerifyPinResponse> {
  const response = await api.post<VerifyPinResponse>('/auth/verify-pin/', data);
  return response.data;
}

export async function setPin(employeeId: number, data: SetPinRequest): Promise<SetPinResponse> {
  const response = await api.post<SetPinResponse>(`/employees/${employeeId}/set-pin/`, data);
  return response.data;
}

// Photo Upload
export async function uploadPhoto(data: UploadPhotoRequest): Promise<TimeEntryPhoto> {
  const formData = new FormData();
  formData.append('time_entry', String(data.time_entry));
  formData.append('image', data.image);
  if (data.caption) {
    formData.append('caption', data.caption);
  }

  const response = await api.post<TimeEntryPhoto>('/photos/', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
}

export async function deletePhoto(photoId: number): Promise<void> {
  await api.delete(`/photos/${photoId}/`);
}

// Admin API (requires ADMIN_API_KEY)
export interface AdminEmployee {
  id: number;
  first_name: string;
  last_name: string;
  full_name: string;
  email: string;
  has_pin: boolean;
  is_active: boolean;
}

export interface AddEmployeeRequest {
  first_name: string;
  last_name: string;
  email?: string;
  pin?: string;
}

function getAdminHeaders(apiKey: string) {
  return {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  };
}

export async function adminListEmployees(apiKey: string): Promise<AdminEmployee[]> {
  const response = await api.get<{ employees: AdminEmployee[] }>('/admin/employees/', {
    headers: getAdminHeaders(apiKey),
  });
  return response.data.employees;
}

export async function adminAddEmployee(apiKey: string, data: AddEmployeeRequest): Promise<AdminEmployee> {
  const response = await api.post<{ employee: AdminEmployee }>('/admin/employees/add/', data, {
    headers: getAdminHeaders(apiKey),
  });
  return response.data.employee;
}

export async function adminSetPin(apiKey: string, employeeId: number, pin: string): Promise<void> {
  await api.post(`/admin/employees/${employeeId}/set-pin/`, { pin }, {
    headers: getAdminHeaders(apiKey),
  });
}

export async function adminDeleteEmployee(apiKey: string, employeeId: number): Promise<void> {
  await api.delete(`/admin/employees/${employeeId}/delete/`, {
    headers: getAdminHeaders(apiKey),
  });
}

import axios from 'axios';
import type {
  Employee,
  JobCodeCategory,
  TimeEntry,
  TimeEntryDetail,
  PaginatedResponse,
  ClockStartRequest,
  ClockStopRequest,
  InterruptedStartRequest,
  InterruptedStopRequest,
  CurrentEntryResponse,
  InterruptedStopResponse,
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

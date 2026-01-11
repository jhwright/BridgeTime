import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from '../api/client';
import type {
  ClockStartRequest,
  ClockStopRequest,
  InterruptedStartRequest,
  InterruptedStopRequest,
  TimeEntry,
} from '../types';

// Query Keys
export const queryKeys = {
  employees: ['employees'] as const,
  currentEntry: (employeeId: number) => ['currentEntry', employeeId] as const,
  jobCategories: ['jobCategories'] as const,
  timeEntries: (filters?: api.TimeEntryFilters) => ['timeEntries', filters] as const,
};

// Employee Hooks
export function useEmployees() {
  return useQuery({
    queryKey: queryKeys.employees,
    queryFn: api.getEmployees,
  });
}

export function useCurrentEntry(employeeId: number | null) {
  return useQuery({
    queryKey: queryKeys.currentEntry(employeeId ?? 0),
    queryFn: () => api.getCurrentEntry(employeeId!),
    enabled: employeeId !== null,
    refetchInterval: 30000, // Refetch every 30 seconds
  });
}

// Job Code Hooks
export function useJobCategories() {
  return useQuery({
    queryKey: queryKeys.jobCategories,
    queryFn: api.getJobCategories,
  });
}

// Clock Action Hooks
export function useClockStart() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: ClockStartRequest) => api.clockStart(data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.currentEntry(variables.employee_id) });
      queryClient.invalidateQueries({ queryKey: ['timeEntries'] });
    },
  });
}

export function useClockStop() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: ClockStopRequest) => api.clockStop(data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.currentEntry(variables.employee_id) });
      queryClient.invalidateQueries({ queryKey: ['timeEntries'] });
    },
  });
}

export function useInterruptedStart() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: InterruptedStartRequest) => api.interruptedStart(data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.currentEntry(variables.employee_id) });
      queryClient.invalidateQueries({ queryKey: ['timeEntries'] });
    },
  });
}

export function useInterruptedStop() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: InterruptedStopRequest) => api.interruptedStop(data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.currentEntry(variables.employee_id) });
      queryClient.invalidateQueries({ queryKey: ['timeEntries'] });
    },
  });
}

// Time Entry Hooks (Admin)
export function useTimeEntries(filters?: api.TimeEntryFilters) {
  return useQuery({
    queryKey: queryKeys.timeEntries(filters),
    queryFn: () => api.getTimeEntries(filters),
  });
}

export function useUpdateTimeEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<TimeEntry> }) =>
      api.updateTimeEntry(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timeEntries'] });
    },
  });
}

export function useDeleteTimeEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => api.deleteTimeEntry(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timeEntries'] });
    },
  });
}

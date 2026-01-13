import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from '../api/client';
import type {
  ClockStartRequest,
  ClockStopRequest,
  InterruptedStartRequest,
  InterruptedStopRequest,
  TimeEntry,
  SessionStartRequest,
  SessionStopRequest,
  SessionSwitchRequest,
  SessionTagUpdateRequest,
  VerifyPinRequest,
  SetPinRequest,
  UploadPhotoRequest,
} from '../types';

// Query Keys
export const queryKeys = {
  employees: ['employees'] as const,
  currentEntry: (employeeId: number) => ['currentEntry', employeeId] as const,
  jobCategories: ['jobCategories'] as const,
  timeEntries: (filters?: api.TimeEntryFilters) => ['timeEntries', filters] as const,
  // New session-based keys
  activeSession: ['activeSession'] as const,
  activityTags: ['activityTags'] as const,
  tagsForRole: (roleId: number) => ['tagsForRole', roleId] as const,
  insightsRoleHours: (filters?: api.InsightsFilters) => ['insightsRoleHours', filters] as const,
  insightsTagDistribution: (filters?: api.InsightsFilters) => ['insightsTagDistribution', filters] as const,
  insightsPatterns: (filters?: api.InsightsFilters) => ['insightsPatterns', filters] as const,
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

// ============================================
// New Session-based Hooks (Role-based tracking)
// ============================================

// Activity Tags
export function useActivityTags() {
  return useQuery({
    queryKey: queryKeys.activityTags,
    queryFn: api.getActivityTags,
  });
}

export function useTagsForRole(roleId: number | null) {
  return useQuery({
    queryKey: queryKeys.tagsForRole(roleId ?? 0),
    queryFn: () => api.getTagsForRole(roleId!),
    enabled: roleId !== null,
  });
}

// Active Session (role-based, no employee required)
export function useActiveSession() {
  return useQuery({
    queryKey: queryKeys.activeSession,
    queryFn: api.getActiveSession,
    refetchInterval: 30000, // Refetch every 30 seconds
  });
}

// Session Actions
export function useSessionStart() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: SessionStartRequest) => api.sessionStart(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.activeSession });
      queryClient.invalidateQueries({ queryKey: ['timeEntries'] });
    },
  });
}

export function useSessionStop() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: SessionStopRequest = {}) => api.sessionStop(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.activeSession });
      queryClient.invalidateQueries({ queryKey: ['timeEntries'] });
    },
  });
}

export function useSessionSwitch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: SessionSwitchRequest) => api.sessionSwitch(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.activeSession });
      queryClient.invalidateQueries({ queryKey: ['timeEntries'] });
    },
  });
}

export function useUpdateSessionTags() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ sessionId, data }: { sessionId: number; data: SessionTagUpdateRequest }) =>
      api.updateSessionTags(sessionId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.activeSession });
    },
  });
}

// Insights Hooks
export function useInsightsRoleHours(filters?: api.InsightsFilters) {
  return useQuery({
    queryKey: queryKeys.insightsRoleHours(filters),
    queryFn: () => api.getInsightsRoleHours(filters),
  });
}

export function useInsightsTagDistribution(filters?: api.InsightsFilters) {
  return useQuery({
    queryKey: queryKeys.insightsTagDistribution(filters),
    queryFn: () => api.getInsightsTagDistribution(filters),
  });
}

export function useInsightsPatterns(filters?: api.InsightsFilters) {
  return useQuery({
    queryKey: queryKeys.insightsPatterns(filters),
    queryFn: () => api.getInsightsPatterns(filters),
  });
}

// ============================================
// PIN Authentication Hooks
// ============================================

export function useVerifyPin() {
  return useMutation({
    mutationFn: (data: VerifyPinRequest) => api.verifyPin(data),
  });
}

export function useSetPin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ employeeId, data }: { employeeId: number; data: SetPinRequest }) =>
      api.setPin(employeeId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.employees });
    },
  });
}

// ============================================
// Photo Hooks
// ============================================

export function useUploadPhoto() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UploadPhotoRequest) => api.uploadPhoto(data),
    onSuccess: () => {
      // Invalidate queries that might include photos
      queryClient.invalidateQueries({ queryKey: ['timeEntries'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.activeSession });
      // Invalidate all currentEntry queries to show new photos
      queryClient.invalidateQueries({ queryKey: ['currentEntry'] });
    },
  });
}

export function useDeletePhoto() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (photoId: number) => api.deletePhoto(photoId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timeEntries'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.activeSession });
      queryClient.invalidateQueries({ queryKey: ['currentEntry'] });
    },
  });
}

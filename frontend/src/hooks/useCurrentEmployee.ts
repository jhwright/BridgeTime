import { useState, useEffect } from 'react';
import { useEmployees } from './useApi';
import type { Employee } from '../types';

const AUTH_KEY = 'bridgetime-auth';
const AUTH_EVENT = 'bridgetime-auth-change';
const AUTH_TIMEOUT_MS = 8 * 60 * 60 * 1000; // 8 hours

interface AuthState {
  employeeId: number;
  timestamp: number;
}

function getStoredAuth(): AuthState | null {
  const stored = localStorage.getItem(AUTH_KEY);
  if (!stored) return null;

  try {
    const auth = JSON.parse(stored) as AuthState;
    const now = Date.now();
    if (now - auth.timestamp > AUTH_TIMEOUT_MS) {
      localStorage.removeItem(AUTH_KEY);
      return null;
    }
    return auth;
  } catch {
    return null;
  }
}

// Dispatch custom event when auth changes
export function notifyAuthChange(): void {
  window.dispatchEvent(new CustomEvent(AUTH_EVENT));
}

export function useCurrentEmployee(): { currentEmployee: Employee | null } {
  const { data: employees } = useEmployees();
  const [authEmployeeId, setAuthEmployeeId] = useState<number | null>(() => {
    const auth = getStoredAuth();
    return auth?.employeeId ?? null;
  });

  // Listen for auth changes (both storage events and custom events)
  useEffect(() => {
    const handleAuthChange = () => {
      const auth = getStoredAuth();
      setAuthEmployeeId(auth?.employeeId ?? null);
    };

    // Listen for storage events (from other tabs)
    window.addEventListener('storage', handleAuthChange);
    // Listen for custom auth events (from same tab)
    window.addEventListener(AUTH_EVENT, handleAuthChange);

    return () => {
      window.removeEventListener('storage', handleAuthChange);
      window.removeEventListener(AUTH_EVENT, handleAuthChange);
    };
  }, []);

  const currentEmployee = employees?.find((e) => e.id === authEmployeeId) ?? null;

  return { currentEmployee };
}

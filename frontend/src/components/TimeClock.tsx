import { useState, useEffect } from 'react';
import { EmployeeSelect } from './EmployeeSelect';
import { PinEntry } from './PinEntry';
import { JobSelect } from './JobSelect';
import { ActiveTimer } from './ActiveTimer';
import { InterruptionModal } from './InterruptionModal';
import { StartJobModal } from './StartJobModal';
import { AddPhotoButton } from './AddPhotoButton';
import { PhotoGallery } from './PhotoGallery';
import {
  useCurrentEntry,
  useClockStart,
  useClockStop,
  useInterruptedStart,
  useInterruptedStop,
  useEmployees,
  useVerifyPin,
  useUploadPhoto,
} from '../hooks/useApi';
import { notifyAuthChange } from '../hooks/useCurrentEmployee';
import type { CapturedPhoto } from './PhotoCapture';
import type { Employee, JobCodeCategory, JobCode } from '../types';

const STORAGE_KEY = 'bridgetime-employee-id';
const AUTH_KEY = 'bridgetime-auth';
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

function setStoredAuth(employeeId: number): void {
  const auth: AuthState = { employeeId, timestamp: Date.now() };
  localStorage.setItem(AUTH_KEY, JSON.stringify(auth));
  notifyAuthChange();
}

function clearStoredAuth(): void {
  localStorage.removeItem(AUTH_KEY);
  notifyAuthChange();
}

export function TimeClock() {
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pinError, setPinError] = useState<string | undefined>();
  const [initialLoadDone, setInitialLoadDone] = useState(false);
  const { data: employees } = useEmployees();

  const verifyPin = useVerifyPin();

  // Load saved employee and auth from localStorage on mount
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => {
    if (employees && !initialLoadDone) {
      const storedAuth = getStoredAuth();
      const savedId = localStorage.getItem(STORAGE_KEY);

      if (storedAuth) {
        const employee = employees.find((e) => e.id === storedAuth.employeeId);
        if (employee) {
          setSelectedEmployee(employee);
          setIsAuthenticated(true);
        }
      } else if (savedId) {
        const employee = employees.find((e) => e.id === Number(savedId));
        if (employee) {
          setSelectedEmployee(employee);
          // If employee has no PIN, they're automatically authenticated
          if (!employee.has_pin) {
            setIsAuthenticated(true);
            setStoredAuth(employee.id);
          }
        }
      }
      setInitialLoadDone(true);
    }
  }, [employees, initialLoadDone]);

  // Handle employee selection change
  const handleEmployeeChange = (employee: Employee | null) => {
    setSelectedEmployee(employee);
    setPinError(undefined);

    if (employee) {
      localStorage.setItem(STORAGE_KEY, String(employee.id));
      // If employee has no PIN, they're automatically authenticated
      if (!employee.has_pin) {
        setIsAuthenticated(true);
        setStoredAuth(employee.id);
      } else {
        setIsAuthenticated(false);
        clearStoredAuth();
      }
    } else {
      localStorage.removeItem(STORAGE_KEY);
      setIsAuthenticated(false);
      clearStoredAuth();
    }
  };

  // Handle PIN verification
  const handlePinVerify = async (pin: string): Promise<boolean> => {
    if (!selectedEmployee) return false;

    setPinError(undefined);
    try {
      const result = await verifyPin.mutateAsync({
        employee_id: selectedEmployee.id,
        pin,
      });

      if (result.valid) {
        setIsAuthenticated(true);
        setStoredAuth(selectedEmployee.id);
        return true;
      } else {
        setPinError(result.error || 'Invalid PIN');
        return false;
      }
    } catch {
      setPinError('Invalid PIN');
      return false;
    }
  };

  // Handle back from PIN entry
  const handlePinBack = () => {
    setSelectedEmployee(null);
    setPinError(undefined);
    localStorage.removeItem(STORAGE_KEY);
  };

  const [showInterruptionModal, setShowInterruptionModal] = useState(false);
  const [showStartJobModal, setShowStartJobModal] = useState(false);

  const { data: currentEntry, isLoading: loadingEntry } = useCurrentEntry(
    isAuthenticated && selectedEmployee ? selectedEmployee.id : null
  );

  const clockStart = useClockStart();
  const clockStop = useClockStop();
  const interruptedStart = useInterruptedStart();
  const interruptedStop = useInterruptedStop();
  const uploadPhoto = useUploadPhoto();

  const isLoading =
    clockStart.isPending ||
    clockStop.isPending ||
    interruptedStart.isPending ||
    interruptedStop.isPending ||
    uploadPhoto.isPending;

  const handleJobSelect = async (
    selection: { category: JobCodeCategory; jobCode: JobCode | null },
    description: string,
    photos: CapturedPhoto[] = []
  ) => {
    if (!selectedEmployee) return;

    const entry = await clockStart.mutateAsync({
      employee_id: selectedEmployee.id,
      job_category_id: selection.jobCode ? undefined : selection.category.id,
      job_code_id: selection.jobCode?.id,
      description,
    });

    // Upload photos if any were captured
    if (photos.length > 0 && entry.id) {
      await Promise.all(
        photos.map((photo) =>
          uploadPhoto.mutateAsync({
            time_entry: entry.id,
            image: photo.file,
          })
        )
      );
    }

    setShowStartJobModal(false);
  };

  const handleQuickJobSelect = async (selection: { category: JobCodeCategory; jobCode: JobCode | null }) => {
    // For switch job, use empty description and no photos (quick switch)
    await handleJobSelect(selection, '', []);
  };

  const handleStop = async () => {
    if (!selectedEmployee) return;
    await clockStop.mutateAsync({ employee_id: selectedEmployee.id });
  };

  const handleInterruptedStart = async (
    selection: { category: JobCodeCategory; jobCode: JobCode | null },
    reason: string
  ) => {
    if (!selectedEmployee) return;

    await interruptedStart.mutateAsync({
      employee_id: selectedEmployee.id,
      job_category_id: selection.jobCode ? undefined : selection.category.id,
      job_code_id: selection.jobCode?.id,
      reason,
    });
    setShowInterruptionModal(false);
  };

  const handleInterruptedStop = async () => {
    if (!selectedEmployee) return;
    await interruptedStop.mutateAsync({ employee_id: selectedEmployee.id });
  };

  // Handle logout
  const handleLogout = () => {
    setSelectedEmployee(null);
    setIsAuthenticated(false);
    clearStoredAuth();
    localStorage.removeItem(STORAGE_KEY);
  };

  // Not selected - show employee select
  if (!selectedEmployee) {
    return (
      <div className="time-clock">
        <h1>BridgeTime</h1>
        <EmployeeSelect value={null} onChange={handleEmployeeChange} />
      </div>
    );
  }

  // Employee selected but needs PIN verification
  if (selectedEmployee.has_pin && !isAuthenticated) {
    return (
      <div className="time-clock">
        <h1>BridgeTime</h1>
        <PinEntry
          employee={selectedEmployee}
          onVerify={handlePinVerify}
          onBack={handlePinBack}
          error={pinError}
          isPending={verifyPin.isPending}
        />
      </div>
    );
  }

  if (loadingEntry) {
    return (
      <div className="time-clock">
        <div className="loading">Loading...</div>
      </div>
    );
  }

  // Employee authenticated but not clocked in
  if (!currentEntry) {
    return (
      <div className="time-clock">
        <button
          className="btn btn-primary btn-large"
          onClick={() => setShowStartJobModal(true)}
          disabled={isLoading}
          style={{ marginBottom: '1rem', width: '100%' }}
        >
          START JOB
        </button>

        <button
          className="btn btn-secondary btn-sm"
          onClick={handleLogout}
          style={{ width: '100%' }}
        >
          Logout
        </button>

        {showStartJobModal && (
          <StartJobModal
            onSubmit={handleJobSelect}
            onCancel={() => setShowStartJobModal(false)}
            disabled={isLoading}
          />
        )}
      </div>
    );
  }

  // Clocked in during an interruption
  if (currentEntry.is_interruption) {
    return (
      <div className="time-clock">
        <ActiveTimer entry={currentEntry} />

        {currentEntry.paused_entry && (
          <div className="paused-entry">
            <span className="badge paused-badge">PAUSED</span>
            <div className="job-name">{currentEntry.paused_entry.job_display_name}</div>
          </div>
        )}

        <div className="add-photo-section">
          <AddPhotoButton timeEntryId={currentEntry.id} disabled={isLoading} />
          {currentEntry.photos && currentEntry.photos.length > 0 && (
            <PhotoGallery photos={currentEntry.photos} disabled={isLoading} />
          )}
        </div>

        <div className="actions">
          <button
            className="btn btn-warning btn-large"
            onClick={handleInterruptedStop}
            disabled={isLoading}
          >
            INTERRUPTED STOP
          </button>
        </div>
      </div>
    );
  }

  // Clocked in (normal)
  return (
    <div className="time-clock">
      <ActiveTimer entry={currentEntry} />

      {currentEntry.description && (
        <div className="entry-description">
          <strong>Description:</strong> {currentEntry.description}
        </div>
      )}

      <div className="add-photo-section">
        <AddPhotoButton timeEntryId={currentEntry.id} disabled={isLoading} />
        {currentEntry.photos && currentEntry.photos.length > 0 && (
          <PhotoGallery photos={currentEntry.photos} disabled={isLoading} />
        )}
      </div>

      <div className="actions">
        <button className="btn btn-danger btn-large" onClick={handleStop} disabled={isLoading}>
          STOP
        </button>
        <button
          className="btn btn-secondary"
          onClick={() => setShowInterruptionModal(true)}
          disabled={isLoading}
        >
          INTERRUPTED START
        </button>
      </div>

      <div className="switch-job">
        <h3>Switch Job</h3>
        <JobSelect onSelect={handleQuickJobSelect} disabled={isLoading} />
      </div>

      {showInterruptionModal && (
        <InterruptionModal
          onSubmit={handleInterruptedStart}
          onCancel={() => setShowInterruptionModal(false)}
          disabled={isLoading}
        />
      )}
    </div>
  );
}

import { useState, useEffect } from 'react';
import { EmployeeSelect } from './EmployeeSelect';
import { JobSelect } from './JobSelect';
import { ActiveTimer } from './ActiveTimer';
import { InterruptionModal } from './InterruptionModal';
import { StartJobModal } from './StartJobModal';
import {
  useCurrentEntry,
  useClockStart,
  useClockStop,
  useInterruptedStart,
  useInterruptedStop,
  useEmployees,
} from '../hooks/useApi';
import type { Employee, JobCodeCategory, JobCode } from '../types';

const STORAGE_KEY = 'bridge-time-employee-id';

export function TimeClock() {
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [initialLoadDone, setInitialLoadDone] = useState(false);
  const { data: employees } = useEmployees();

  // Load saved employee from localStorage on mount
  useEffect(() => {
    if (employees && !initialLoadDone) {
      const savedId = localStorage.getItem(STORAGE_KEY);
      if (savedId) {
        const employee = employees.find((e) => e.id === Number(savedId));
        if (employee) {
          setSelectedEmployee(employee);
        }
      }
      setInitialLoadDone(true);
    }
  }, [employees, initialLoadDone]);

  // Save employee to localStorage when changed
  const handleEmployeeChange = (employee: Employee | null) => {
    setSelectedEmployee(employee);
    if (employee) {
      localStorage.setItem(STORAGE_KEY, String(employee.id));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  };
  const [showInterruptionModal, setShowInterruptionModal] = useState(false);
  const [showStartJobModal, setShowStartJobModal] = useState(false);

  const { data: currentEntry, isLoading: loadingEntry } = useCurrentEntry(
    selectedEmployee?.id ?? null
  );

  const clockStart = useClockStart();
  const clockStop = useClockStop();
  const interruptedStart = useInterruptedStart();
  const interruptedStop = useInterruptedStop();

  const isLoading =
    clockStart.isPending ||
    clockStop.isPending ||
    interruptedStart.isPending ||
    interruptedStop.isPending;

  const handleJobSelect = async (
    selection: { category: JobCodeCategory; jobCode: JobCode | null },
    description: string
  ) => {
    if (!selectedEmployee) return;

    await clockStart.mutateAsync({
      employee_id: selectedEmployee.id,
      job_category_id: selection.jobCode ? undefined : selection.category.id,
      job_code_id: selection.jobCode?.id,
      description,
    });
    setShowStartJobModal(false);
  };

  const handleQuickJobSelect = async (selection: { category: JobCodeCategory; jobCode: JobCode | null }) => {
    // For switch job, use empty description (quick switch)
    await handleJobSelect(selection, '');
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

  // Not clocked in - show employee select and job select
  if (!selectedEmployee) {
    return (
      <div className="time-clock">
        <h1>Bridge Time</h1>
        <EmployeeSelect value={null} onChange={handleEmployeeChange} />
      </div>
    );
  }

  if (loadingEntry) {
    return (
      <div className="time-clock">
        <h1>Bridge Time</h1>
        <EmployeeSelect value={selectedEmployee.id} onChange={handleEmployeeChange} />
        <div className="loading">Loading...</div>
      </div>
    );
  }

  // Employee selected but not clocked in
  if (!currentEntry) {
    return (
      <div className="time-clock">
        <h1>Bridge Time</h1>
        <EmployeeSelect value={selectedEmployee.id} onChange={handleEmployeeChange} />

        <button
          className="btn btn-primary btn-large"
          onClick={() => setShowStartJobModal(true)}
          disabled={isLoading}
          style={{ marginBottom: '1rem', width: '100%' }}
        >
          START JOB
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
        <h1>Bridge Time</h1>
        <EmployeeSelect value={selectedEmployee.id} onChange={handleEmployeeChange} />

        <ActiveTimer entry={currentEntry} />

        {currentEntry.paused_entry && (
          <div className="paused-entry">
            <span className="badge paused-badge">PAUSED</span>
            <div className="job-name">{currentEntry.paused_entry.job_display_name}</div>
          </div>
        )}

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
      <h1>Bridge Time</h1>
      <EmployeeSelect value={selectedEmployee.id} onChange={handleEmployeeChange} />

      <ActiveTimer entry={currentEntry} />

      {currentEntry.description && (
        <div className="entry-description">
          <strong>Description:</strong> {currentEntry.description}
        </div>
      )}

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

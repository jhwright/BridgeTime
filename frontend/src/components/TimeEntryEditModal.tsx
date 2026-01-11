import { useState } from 'react';
import { useUpdateTimeEntry } from '../hooks/useApi';
import type { TimeEntry } from '../types';

interface TimeEntryEditModalProps {
  entry: TimeEntry;
  onClose: () => void;
}

function toLocalDateTimeString(isoString: string): string {
  const date = new Date(isoString);
  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - offset * 60 * 1000);
  return localDate.toISOString().slice(0, 16);
}

function toISOString(localDateTimeString: string): string {
  return new Date(localDateTimeString).toISOString();
}

export function TimeEntryEditModal({ entry, onClose }: TimeEntryEditModalProps) {
  const [startTime, setStartTime] = useState(toLocalDateTimeString(entry.start_time));
  const [endTime, setEndTime] = useState(
    entry.end_time ? toLocalDateTimeString(entry.end_time) : ''
  );
  const [description, setDescription] = useState(entry.description || '');

  const updateEntry = useUpdateTimeEntry();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    await updateEntry.mutateAsync({
      id: entry.id,
      data: {
        start_time: toISOString(startTime),
        end_time: endTime ? toISOString(endTime) : null,
        description,
      },
    });

    onClose();
  };

  return (
    <div className="modal-overlay">
      <div className="modal">
        <h2>Edit Time Entry</h2>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Employee</label>
            <input type="text" value={entry.employee_name} disabled />
          </div>

          <div className="form-group">
            <label>Job</label>
            <input type="text" value={entry.job_display_name} disabled />
          </div>

          <div className="form-group">
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What was worked on?"
              rows={3}
            />
          </div>

          <div className="form-group">
            <label htmlFor="start-time">Start Time</label>
            <input
              id="start-time"
              type="datetime-local"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="end-time">End Time</label>
            <input
              id="end-time"
              type="datetime-local"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
            />
            <small>Leave empty if still active</small>
          </div>

          {entry.is_interruption && entry.interruption_reason && (
            <div className="form-group">
              <label>Interruption Reason</label>
              <input type="text" value={entry.interruption_reason} disabled />
            </div>
          )}

          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={updateEntry.isPending}>
              {updateEntry.isPending ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

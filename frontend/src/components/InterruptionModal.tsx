import { useState } from 'react';
import { JobSelect } from './JobSelect';
import type { JobCodeCategory, JobCode } from '../types';

interface InterruptionModalProps {
  onSubmit: (
    selection: { category: JobCodeCategory; jobCode: JobCode | null },
    reason: string
  ) => void;
  onCancel: () => void;
  disabled?: boolean;
}

export function InterruptionModal({ onSubmit, onCancel, disabled }: InterruptionModalProps) {
  const [selection, setSelection] = useState<{
    category: JobCodeCategory;
    jobCode: JobCode | null;
  } | null>(null);
  const [reason, setReason] = useState('');

  const handleSubmit = () => {
    if (!selection || !reason.trim()) return;
    onSubmit(selection, reason.trim());
  };

  return (
    <div className="modal-overlay">
      <div className="modal">
        <h2>Start Interruption</h2>

        {!selection ? (
          <>
            <p>Select the job for this interruption:</p>
            <JobSelect onSelect={setSelection} disabled={disabled} />
          </>
        ) : (
          <>
            <div className="selected-job">
              <strong>Job:</strong> {selection.jobCode?.name ?? selection.category.name}
              <button className="btn-link" onClick={() => setSelection(null)}>
                Change
              </button>
            </div>

            <div className="form-group">
              <label htmlFor="reason">Reason for interruption:</label>
              <textarea
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g., Emergency repair call, Client request..."
                rows={3}
                disabled={disabled}
              />
            </div>

            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={onCancel} disabled={disabled}>
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleSubmit}
                disabled={disabled || !reason.trim()}
              >
                Start Interruption
              </button>
            </div>
          </>
        )}

        {!selection && (
          <div className="modal-actions">
            <button className="btn btn-secondary" onClick={onCancel} disabled={disabled}>
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

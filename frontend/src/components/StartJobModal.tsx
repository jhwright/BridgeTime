import { useState } from 'react';
import { JobSelect } from './JobSelect';
import type { JobCodeCategory, JobCode } from '../types';

interface StartJobModalProps {
  onSubmit: (
    selection: { category: JobCodeCategory; jobCode: JobCode | null },
    description: string
  ) => void;
  onCancel: () => void;
  disabled?: boolean;
  title?: string;
}

export function StartJobModal({ onSubmit, onCancel, disabled, title = 'Start Job' }: StartJobModalProps) {
  const [selection, setSelection] = useState<{
    category: JobCodeCategory;
    jobCode: JobCode | null;
  } | null>(null);
  const [description, setDescription] = useState('');

  const handleSubmit = () => {
    if (!selection) return;
    onSubmit(selection, description.trim());
  };

  return (
    <div className="modal-overlay">
      <div className="modal">
        <h2>{title}</h2>

        {!selection ? (
          <>
            <p>Select a job:</p>
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
              <label htmlFor="description">Description (optional):</label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What will you be working on?"
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
                disabled={disabled}
              >
                Start
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

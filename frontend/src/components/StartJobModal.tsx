import { useState, useCallback } from 'react';
import { JobSelect } from './JobSelect';
import { PhotoCapture, type CapturedPhoto } from './PhotoCapture';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import type { JobCodeCategory, JobCode } from '../types';

interface StartJobModalProps {
  onSubmit: (
    selection: { category: JobCodeCategory; jobCode: JobCode | null },
    description: string,
    photos: CapturedPhoto[]
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
  const [photos, setPhotos] = useState<CapturedPhoto[]>([]);

  const handleVoiceResult = useCallback((transcript: string) => {
    setDescription((prev) => {
      const trimmed = prev.trim();
      if (trimmed) {
        return `${trimmed} ${transcript}`;
      }
      return transcript;
    });
  }, []);

  const {
    isListening,
    isSupported,
    transcript,
    error: voiceError,
    startListening,
    stopListening,
  } = useSpeechRecognition({
    onResult: handleVoiceResult,
  });

  const handleSubmit = () => {
    if (!selection) return;
    onSubmit(selection, description.trim(), photos);
  };

  const handleVoiceToggle = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
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
              <div className="textarea-with-voice">
                <textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What will you be working on?"
                  rows={3}
                  disabled={disabled || isListening}
                />
                {isSupported && (
                  <button
                    type="button"
                    className={`voice-button ${isListening ? 'listening' : ''}`}
                    onClick={handleVoiceToggle}
                    disabled={disabled}
                    title={isListening ? 'Stop recording' : 'Start voice input'}
                  >
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                      <line x1="12" y1="19" x2="12" y2="23" />
                      <line x1="8" y1="23" x2="16" y2="23" />
                    </svg>
                  </button>
                )}
              </div>
              {isListening && transcript && (
                <div className="voice-preview">
                  <span className="voice-indicator" /> {transcript}
                </div>
              )}
              {voiceError && <div className="voice-error">{voiceError}</div>}
            </div>

            <div className="form-group">
              <label>Photos (optional):</label>
              <PhotoCapture
                photos={photos}
                onChange={setPhotos}
                maxPhotos={5}
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
                disabled={disabled || isListening}
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

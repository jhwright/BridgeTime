import { useState } from 'react';
import { RoleSelect, type RoleSelection } from './RoleSelect';
import { ActiveSession } from './ActiveSession';
import {
  useActiveSession,
  useSessionStart,
  useSessionStop,
  useSessionSwitch,
} from '../hooks/useApi';

export function SessionTracker() {
  const [performerName, setPerformerName] = useState(() => {
    return localStorage.getItem('bridgetime-performer-name') ?? '';
  });
  const [showNameInput, setShowNameInput] = useState(false);

  const { data: activeSession, isLoading: loadingSession } = useActiveSession();

  const sessionStart = useSessionStart();
  const sessionStop = useSessionStop();
  const sessionSwitch = useSessionSwitch();

  const isLoading =
    sessionStart.isPending || sessionStop.isPending || sessionSwitch.isPending;

  const handleRoleSelect = async (selection: RoleSelection) => {
    // Save performer name
    if (performerName) {
      localStorage.setItem('bridgetime-performer-name', performerName);
    }

    if (activeSession) {
      // Switch to new role
      await sessionSwitch.mutateAsync({
        role_id: selection.role.id,
        job_code_id: selection.jobCode?.id,
        performer_name: performerName,
      });
    } else {
      // Start new session
      await sessionStart.mutateAsync({
        role_id: selection.role.id,
        job_code_id: selection.jobCode?.id,
        performer_name: performerName,
      });
    }
  };

  const handleStop = async () => {
    await sessionStop.mutateAsync({});
  };

  const handleNameChange = (name: string) => {
    setPerformerName(name);
    if (name) {
      localStorage.setItem('bridgetime-performer-name', name);
    } else {
      localStorage.removeItem('bridgetime-performer-name');
    }
  };

  if (loadingSession) {
    return (
      <div className="session-tracker">
        <h1>Bridge Time</h1>
        <div className="loading">Loading...</div>
      </div>
    );
  }

  // Active session - show timer and controls
  if (activeSession) {
    return (
      <div className="session-tracker">
        <header className="tracker-header">
          <h1>Bridge Time</h1>
          <button
            className="settings-button"
            onClick={() => setShowNameInput(!showNameInput)}
            title="Settings"
          >
            Settings
          </button>
        </header>

        {showNameInput && (
          <div className="name-input-section">
            <label htmlFor="performer-name">Your name (optional):</label>
            <input
              id="performer-name"
              type="text"
              value={performerName}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="Who's working?"
            />
          </div>
        )}

        <ActiveSession session={activeSession} />

        <div className="session-actions">
          <button
            className="btn btn-danger btn-large"
            onClick={handleStop}
            disabled={isLoading}
          >
            END SESSION
          </button>
        </div>

        <div className="switch-role">
          <h3>Switch to...</h3>
          <RoleSelect onSelect={handleRoleSelect} disabled={isLoading} />
        </div>
      </div>
    );
  }

  // No active session - show role selection
  return (
    <div className="session-tracker">
      <header className="tracker-header">
        <h1>Bridge Time</h1>
        <button
          className="settings-button"
          onClick={() => setShowNameInput(!showNameInput)}
          title="Settings"
        >
          Settings
        </button>
      </header>

      {showNameInput && (
        <div className="name-input-section">
          <label htmlFor="performer-name">Your name (optional):</label>
          <input
            id="performer-name"
            type="text"
            value={performerName}
            onChange={(e) => handleNameChange(e.target.value)}
            placeholder="Who's working?"
          />
        </div>
      )}

      <RoleSelect onSelect={handleRoleSelect} disabled={isLoading} />
    </div>
  );
}

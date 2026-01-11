import { useState, useEffect } from 'react';
import type { TimeEntryDetail } from '../types';

interface ActiveTimerProps {
  entry: TimeEntryDetail;
}

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

export function ActiveTimer({ entry }: ActiveTimerProps) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const startTime = new Date(entry.start_time).getTime();

    const updateElapsed = () => {
      const now = Date.now();
      setElapsed((now - startTime) / 1000);
    };

    updateElapsed();
    const interval = setInterval(updateElapsed, 1000);

    return () => clearInterval(interval);
  }, [entry.start_time]);

  return (
    <div className={`active-timer ${entry.is_interruption ? 'interruption' : ''}`}>
      {entry.is_interruption && <span className="badge interruption-badge">INTERRUPTION</span>}
      <div className="job-name">{entry.job_display_name}</div>
      <div className="duration">{formatDuration(elapsed)}</div>
      {entry.is_interruption && entry.interruption_reason && (
        <div className="reason">Reason: {entry.interruption_reason}</div>
      )}
    </div>
  );
}

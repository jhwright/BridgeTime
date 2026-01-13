import { useState, useEffect, useMemo, useRef } from 'react';
import { TagBar } from './TagBar';
import { useTagsForRole, useUpdateSessionTags } from '../hooks/useApi';
import type { Session } from '../types';

interface ActiveSessionProps {
  session: Session;
}

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export function ActiveSession({ session }: ActiveSessionProps) {
  const [elapsed, setElapsed] = useState(0);

  // Derive selected tag IDs from session data
  const serverTagIds = useMemo(
    () => session.activity_tags?.map((t) => t.id) ?? [],
    [session.activity_tags]
  );

  // Track server state for comparison
  const prevServerTagIds = useRef(serverTagIds);

  // Local state for optimistic updates
  const [localTagIds, setLocalTagIds] = useState<number[] | null>(null);

  // Reset local state when server state changes
  if (prevServerTagIds.current !== serverTagIds) {
    prevServerTagIds.current = serverTagIds;
    if (localTagIds !== null) {
      setLocalTagIds(null);
    }
  }

  const selectedTagIds = localTagIds ?? serverTagIds;

  const roleId = session.job_category;
  const { data: availableTags } = useTagsForRole(roleId);
  const updateTags = useUpdateSessionTags();

  useEffect(() => {
    const startTime = new Date(session.start_time).getTime();

    const updateElapsed = () => {
      const now = Date.now();
      setElapsed((now - startTime) / 1000);
    };

    updateElapsed();
    const interval = setInterval(updateElapsed, 1000);

    return () => clearInterval(interval);
  }, [session.start_time]);

  const handleToggleTag = async (tagId: number) => {
    const newTagIds = selectedTagIds.includes(tagId)
      ? selectedTagIds.filter((id) => id !== tagId)
      : [...selectedTagIds, tagId];

    // Optimistic update
    setLocalTagIds(newTagIds);

    // Persist to server
    try {
      await updateTags.mutateAsync({
        sessionId: session.id,
        data: { tag_ids: newTagIds },
      });
    } catch {
      // Revert on error
      setLocalTagIds(null);
    }
  };

  const roleName = session.job_category_detail?.name ?? 'Unknown Role';
  const jobCodeName = session.job_code_detail?.name;

  return (
    <div className="active-session">
      <div className="session-header">
        <div className="role-name">
          {roleName}
          {jobCodeName && <span className="job-code-name"> - {jobCodeName}</span>}
        </div>
        <div className="duration">{formatDuration(elapsed)}</div>
      </div>

      {availableTags && availableTags.length > 0 && (
        <TagBar
          tags={availableTags}
          selectedTagIds={selectedTagIds}
          onToggleTag={handleToggleTag}
          disabled={updateTags.isPending}
        />
      )}
    </div>
  );
}

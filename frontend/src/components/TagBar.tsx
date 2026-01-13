import type { ActivityTag } from '../types';

interface TagBarProps {
  tags: ActivityTag[];
  selectedTagIds: number[];
  onToggleTag: (tagId: number) => void;
  disabled?: boolean;
}

export function TagBar({ tags, selectedTagIds, onToggleTag, disabled }: TagBarProps) {
  if (tags.length === 0) {
    return null;
  }

  return (
    <div className="tag-bar">
      <div className="tag-label">Activity:</div>
      <div className="tag-buttons">
        {tags.map((tag) => {
          const isSelected = selectedTagIds.includes(tag.id);
          return (
            <button
              key={tag.id}
              className={`tag-button ${isSelected ? 'selected' : ''}`}
              onClick={() => onToggleTag(tag.id)}
              disabled={disabled}
              style={{
                '--tag-color': tag.color,
                backgroundColor: isSelected ? tag.color : undefined,
              } as React.CSSProperties}
              title={tag.description || tag.name}
            >
              {tag.name}
              {isSelected && <span className="checkmark">&#10003;</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

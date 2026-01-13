import { useRef, useState } from 'react';

interface CapturedPhoto {
  id: string;
  file: File;
  preview: string;
}

interface PhotoCaptureProps {
  photos: CapturedPhoto[];
  onChange: (photos: CapturedPhoto[]) => void;
  maxPhotos?: number;
  disabled?: boolean;
}

export function PhotoCapture({
  photos,
  onChange,
  maxPhotos = 5,
  disabled = false,
}: PhotoCaptureProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  const handleCapture = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setError(null);

    const file = files[0];

    // Validate file type (include HEIC which may have empty type on some devices)
    const isImage = file.type.startsWith('image/') ||
                    file.name.toLowerCase().endsWith('.heic') ||
                    file.name.toLowerCase().endsWith('.heif');
    if (!isImage) {
      setError('Please select an image file');
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError('Image must be less than 10MB');
      return;
    }

    // Check max photos limit
    if (photos.length >= maxPhotos) {
      setError(`Maximum ${maxPhotos} photos allowed`);
      return;
    }

    // Create preview URL
    const preview = URL.createObjectURL(file);

    const newPhoto: CapturedPhoto = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      file,
      preview,
    };

    onChange([...photos, newPhoto]);

    // Reset input so same file can be selected again
    event.target.value = '';
  };

  const handleRemove = (photoId: string) => {
    const photoToRemove = photos.find((p) => p.id === photoId);
    if (photoToRemove) {
      URL.revokeObjectURL(photoToRemove.preview);
    }
    onChange(photos.filter((p) => p.id !== photoId));
  };

  return (
    <div className="photo-capture">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,.heic,.heif"
        capture="environment"
        onChange={handleFileChange}
        style={{ display: 'none' }}
        disabled={disabled}
      />

      {photos.length > 0 && (
        <div className="photo-previews">
          {photos.map((photo) => (
            <div key={photo.id} className="photo-preview">
              <img src={photo.preview} alt="Captured" />
              <button
                type="button"
                className="photo-remove"
                onClick={() => handleRemove(photo.id)}
                disabled={disabled}
                aria-label="Remove photo"
              >
                X
              </button>
            </div>
          ))}
        </div>
      )}

      {photos.length < maxPhotos && (
        <button
          type="button"
          className="btn btn-secondary photo-capture-btn"
          onClick={handleCapture}
          disabled={disabled}
        >
          <span className="camera-icon">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
              <circle cx="12" cy="13" r="4"></circle>
            </svg>
          </span>
          {photos.length === 0 ? 'Add Photo' : 'Add Another Photo'}
        </button>
      )}

      {error && <div className="photo-error">{error}</div>}

      {photos.length > 0 && (
        <div className="photo-count">
          {photos.length} of {maxPhotos} photos
        </div>
      )}
    </div>
  );
}

export type { CapturedPhoto };

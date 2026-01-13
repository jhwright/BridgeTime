import { useRef, useState } from 'react';
import { useUploadPhoto } from '../hooks/useApi';

interface AddPhotoButtonProps {
  timeEntryId: number;
  disabled?: boolean;
}

export function AddPhotoButton({ timeEntryId, disabled = false }: AddPhotoButtonProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const uploadPhoto = useUploadPhoto();

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
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

    try {
      await uploadPhoto.mutateAsync({
        time_entry: timeEntryId,
        image: file,
      });
    } catch (err: unknown) {
      console.error('Photo upload error:', err);
      // Extract error message from axios error response
      let message = 'Failed to upload photo';
      if (err && typeof err === 'object' && 'response' in err) {
        const response = (err as { response?: { data?: Record<string, string[]> } }).response;
        if (response?.data) {
          // DRF returns errors like {"image": ["error message"]}
          const errors = Object.values(response.data).flat();
          if (errors.length > 0) {
            message = errors[0];
          }
        }
      }
      setError(message);
    }

    // Reset input so same file can be selected again
    event.target.value = '';
  };

  return (
    <div className="add-photo-button">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,.heic,.heif"
        capture="environment"
        onChange={handleFileChange}
        style={{ display: 'none' }}
        disabled={disabled || uploadPhoto.isPending}
      />

      <button
        type="button"
        className="btn btn-secondary"
        onClick={handleClick}
        disabled={disabled || uploadPhoto.isPending}
      >
        <span className="camera-icon">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
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
        {uploadPhoto.isPending ? 'Uploading...' : 'Add Photo'}
      </button>

      {error && <div className="photo-upload-error">{error}</div>}
    </div>
  );
}

import { useState } from 'react';
import { useDeletePhoto } from '../hooks/useApi';
import type { TimeEntryPhoto } from '../types';

interface PhotoGalleryProps {
  photos: TimeEntryPhoto[];
  disabled?: boolean;
}

export function PhotoGallery({ photos, disabled = false }: PhotoGalleryProps) {
  const deletePhoto = useDeletePhoto();
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [viewingPhoto, setViewingPhoto] = useState<TimeEntryPhoto | null>(null);

  if (photos.length === 0) {
    return null;
  }

  const handleDeleteClick = (e: React.MouseEvent, photoId: number) => {
    e.stopPropagation();
    setConfirmDeleteId(photoId);
  };

  const handleConfirmDelete = async (e: React.MouseEvent, photoId: number) => {
    e.stopPropagation();
    setDeletingId(photoId);
    try {
      await deletePhoto.mutateAsync(photoId);
    } finally {
      setDeletingId(null);
      setConfirmDeleteId(null);
    }
  };

  const handleCancelDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setConfirmDeleteId(null);
  };

  const handlePhotoClick = (photo: TimeEntryPhoto) => {
    if (confirmDeleteId !== photo.id) {
      setViewingPhoto(photo);
    }
  };

  const handleCloseLightbox = () => {
    setViewingPhoto(null);
  };

  const handleLightboxDelete = () => {
    if (viewingPhoto) {
      setConfirmDeleteId(viewingPhoto.id);
    }
  };

  const handleLightboxConfirmDelete = async () => {
    if (viewingPhoto) {
      setDeletingId(viewingPhoto.id);
      try {
        await deletePhoto.mutateAsync(viewingPhoto.id);
        setViewingPhoto(null);
      } finally {
        setDeletingId(null);
        setConfirmDeleteId(null);
      }
    }
  };

  return (
    <>
      <div className="photo-gallery">
        <div className="photo-gallery-header">
          <span className="photo-count">{photos.length} photo{photos.length !== 1 ? 's' : ''}</span>
        </div>
        <div className="photo-grid">
          {photos.map((photo) => (
            <div
              key={photo.id}
              className="photo-item"
              onClick={() => handlePhotoClick(photo)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && handlePhotoClick(photo)}
            >
              <img
                src={photo.image_url}
                alt={photo.caption || 'Time entry photo'}
                loading="lazy"
              />
              {confirmDeleteId === photo.id ? (
                <div className="photo-delete-confirm">
                  <span>Delete?</span>
                  <button
                    type="button"
                    className="btn btn-danger btn-sm"
                    onClick={(e) => handleConfirmDelete(e, photo.id)}
                    disabled={disabled || deletingId === photo.id}
                  >
                    {deletingId === photo.id ? '...' : 'Yes'}
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={handleCancelDelete}
                    disabled={disabled || deletingId === photo.id}
                  >
                    No
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  className="photo-delete-btn"
                  onClick={(e) => handleDeleteClick(e, photo.id)}
                  disabled={disabled || deletePhoto.isPending}
                  title="Delete photo"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    <line x1="10" y1="11" x2="10" y2="17"></line>
                    <line x1="14" y1="11" x2="14" y2="17"></line>
                  </svg>
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Lightbox Modal */}
      {viewingPhoto && (
        <div className="photo-lightbox" onClick={handleCloseLightbox}>
          <div className="lightbox-content" onClick={(e) => e.stopPropagation()}>
            <img
              src={viewingPhoto.image_url}
              alt={viewingPhoto.caption || 'Time entry photo'}
            />
            <div className="lightbox-actions">
              {confirmDeleteId === viewingPhoto.id ? (
                <div className="lightbox-delete-confirm">
                  <span>Delete this photo?</span>
                  <button
                    type="button"
                    className="btn btn-danger btn-sm"
                    onClick={handleLightboxConfirmDelete}
                    disabled={deletingId === viewingPhoto.id}
                  >
                    {deletingId === viewingPhoto.id ? 'Deleting...' : 'Yes, Delete'}
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => setConfirmDeleteId(null)}
                    disabled={deletingId === viewingPhoto.id}
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  className="btn btn-danger btn-sm"
                  onClick={handleLightboxDelete}
                  disabled={disabled}
                >
                  Delete Photo
                </button>
              )}
            </div>
            <button
              type="button"
              className="lightbox-close"
              onClick={handleCloseLightbox}
              aria-label="Close"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
        </div>
      )}
    </>
  );
}

import { useCallback, useEffect, useRef, useState } from "react";
import { mediaService } from "@/services/media/media.service";
import type { TProjectMedia } from "@/services/media/media.types";
import { useAppDispatch, useAppSelector } from "@/store";
import {
  fetchMedia,
  mediaAdded,
  mediaRemoved,
  REQUEST_STATUS,
  selectMedia,
  selectMediaStatus,
} from "@/store/slices/media.slice";
import { utils } from "@/utils";

export type TPendingMediaUpload = {
  localId: string;
  fileName: string;
  /** `URL.createObjectURL(file)` — revoked once the upload settles. */
  previewUrl: string;
  progress: number;
};

type TUseMediaLibraryResult = {
  media: readonly TProjectMedia[];
  isLoading: boolean;
  /** Uploads still in flight, for the panel's per-tile progress bar. */
  pendingUploads: readonly TPendingMediaUpload[];
  uploadMedia: (file: File) => void;
  deleteMedia: (mediaId: string) => Promise<void>;
};

/**
 * The Uploads panel's data: fetched once per project (like `fetchProject`),
 * then kept live by the `media:*` broadcasts `useCanvasRoom` already applies.
 * Upload isn't optimistic in the Redux sense (the server mints the real row),
 * but the panel still needs to show *something* the instant a file is picked
 * — `pendingUploads` is local, ephemeral UI state for exactly that, tracking
 * a Canva-style progress tile until the real row lands or the upload fails.
 */
export const useMediaLibrary = (projectId: string): TUseMediaLibraryResult => {
  const dispatch = useAppDispatch();
  const media = useAppSelector((state) => selectMedia(state, projectId));
  const status = useAppSelector((state) => selectMediaStatus(state, projectId));
  const [pendingUploads, setPendingUploads] = useState<TPendingMediaUpload[]>([]);
  const pendingUploadsRef = useRef(pendingUploads);

  useEffect(() => {
    pendingUploadsRef.current = pendingUploads;
  }, [pendingUploads]);

  useEffect(() => {
    if (status === REQUEST_STATUS.IDLE) {
      void dispatch(fetchMedia(projectId));
    }
  }, [dispatch, projectId, status]);

  // Revokes any preview URLs still outstanding if the panel unmounts mid-upload.
  useEffect(() => {
    return () => {
      pendingUploadsRef.current.forEach((pending) => URL.revokeObjectURL(pending.previewUrl));
    };
  }, []);

  const uploadMedia = useCallback(
    (file: File): void => {
      const localId = crypto.randomUUID();
      const previewUrl = URL.createObjectURL(file);

      setPendingUploads((current) => [...current, { localId, fileName: file.name, previewUrl, progress: 0 }]);

      const settle = (): void => {
        URL.revokeObjectURL(previewUrl);
        setPendingUploads((current) => current.filter((pending) => pending.localId !== localId));
      };

      void mediaService
        .uploadMedia(projectId, file, (progress) => {
          setPendingUploads((current) =>
            current.map((pending) => (pending.localId === localId ? { ...pending, progress } : pending)),
          );
        })
        .then((uploaded) => {
          dispatch(mediaAdded({ projectId, media: uploaded }));
        })
        .catch((error: unknown) => {
          utils.toast.error(error instanceof Error ? error.message : "Failed to upload file");
        })
        .finally(settle);
    },
    [dispatch, projectId],
  );

  const deleteMedia = useCallback(
    async (mediaId: string): Promise<void> => {
      try {
        await mediaService.deleteMedia(projectId, mediaId);
        dispatch(mediaRemoved({ projectId, mediaId }));
      } catch (error) {
        utils.toast.error(error instanceof Error ? error.message : "Failed to delete file");
      }
    },
    [dispatch, projectId],
  );

  return { media, isLoading: status === REQUEST_STATUS.LOADING, pendingUploads, uploadMedia, deleteMedia };
};

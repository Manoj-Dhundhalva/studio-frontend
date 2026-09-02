import { api } from "@/services/api";
import { ProjectMediaListSchema, ProjectMediaUploadResponseSchema, type TProjectMedia } from "./media.types";

const toServiceError = (error: unknown, fallback: string): Error => {
  const message = (error as { apiError?: { data?: { error?: string } } })?.apiError?.data?.error;
  return new Error(message ?? fallback);
};

/** Matches the backend's own Cloudinary upload timeout — longer than the API client's default. */
const UPLOAD_TIMEOUT_MS = 2 * 60 * 1000;

class MediaService {
  private static instance: MediaService;

  private constructor() {}

  static getInstance(): MediaService {
    if (!MediaService.instance) {
      MediaService.instance = new MediaService();
    }
    return MediaService.instance;
  }

  listMedia = async (projectId: string): Promise<TProjectMedia[]> => {
    const { data } = await api.get(`/projects/${projectId}/media`);
    return ProjectMediaListSchema.parse(data).media;
  };

  uploadMedia = async (
    projectId: string,
    file: File,
    onProgress?: (percent: number) => void,
  ): Promise<TProjectMedia> => {
    const formData = new FormData();
    formData.append("file", file);

    try {
      const { data } = await api.post(`/projects/${projectId}/media`, formData, {
        timeout: UPLOAD_TIMEOUT_MS,
        onUploadProgress: (event) => {
          if (!onProgress || !event.total) {
            return;
          }

          onProgress(Math.round((event.loaded / event.total) * 100));
        },
      });
      return ProjectMediaUploadResponseSchema.parse(data).media;
    } catch (error) {
      throw toServiceError(error, "Failed to upload file");
    }
  };

  deleteMedia = async (projectId: string, mediaId: string): Promise<void> => {
    try {
      await api.delete(`/projects/${projectId}/media/${mediaId}`);
    } catch (error) {
      throw toServiceError(error, "Failed to delete file");
    }
  };
}

export const mediaService = MediaService.getInstance();

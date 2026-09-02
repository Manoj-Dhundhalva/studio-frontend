import { api } from "@/services/api";
import type { TAspectRatioPreset } from "./canvas.constants";
import {
  CanvasSchema,
  CanvasStateSchema,
  CanvasUpdateResponseSchema,
  SlidesStateSchema,
  type TCanvas,
  type TCanvasState,
  type TSlideOrderEntry,
  type TSlidesState,
} from "./canvas.types";

/** Surfaces the backend's own `error` message rather than axios's status-code text. */
const toServiceError = (error: unknown, fallback: string): Error => {
  const message = (error as { apiError?: { data?: { error?: string } } })?.apiError?.data?.error;
  return new Error(message ?? fallback);
};

class CanvasService {
  private static instance: CanvasService;

  private constructor() {}

  static getInstance(): CanvasService {
    if (!CanvasService.instance) {
      CanvasService.instance = new CanvasService();
    }
    return CanvasService.instance;
  }

  /**
   * Initial editor load: every slide's metadata plus the first slide's
   * elements. The server serves this through its live cache, so an element a
   * peer moved a moment ago arrives at its current position rather than its
   * last-flushed one.
   */
  getSlides = async (projectId: string): Promise<TSlidesState> => {
    try {
      const { data } = await api.get(`/projects/${projectId}/slides`);
      return SlidesStateSchema.parse(data);
    } catch (error) {
      throw toServiceError(error, "Failed to load slides");
    }
  };

  /** Lazy per-slide fetch — the fallback for a slide whose elements aren't in Redux yet. */
  getSlide = async (projectId: string, canvasId: string): Promise<TCanvasState> => {
    try {
      const { data } = await api.get(`/projects/${projectId}/slides/${canvasId}`);
      return CanvasStateSchema.parse(data);
    } catch (error) {
      throw toServiceError(error, "Failed to load slide");
    }
  };

  /** Fallback for changing one slide's workspace settings when the socket is unavailable. */
  updateSlide = async (
    projectId: string,
    canvasId: string,
    patch: {
      width?: number;
      height?: number;
      aspectRatioPreset?: TAspectRatioPreset;
      backgroundColor?: string;
    },
  ): Promise<TCanvas> => {
    try {
      const { data } = await api.patch(`/projects/${projectId}/slides/${canvasId}`, patch);
      return CanvasUpdateResponseSchema.parse(data).canvas;
    } catch (error) {
      throw toServiceError(error, "Failed to update slide");
    }
  };

  /** Non-socket fallback for adding a slide. */
  createSlide = async (projectId: string, afterCanvasId?: string): Promise<TCanvas> => {
    try {
      const { data } = await api.post(`/projects/${projectId}/slides`, { afterCanvasId });
      return CanvasSchema.parse((data as { slide: unknown }).slide);
    } catch (error) {
      throw toServiceError(error, "Failed to create slide");
    }
  };

  /** Non-socket fallback for duplicating a slide. */
  duplicateSlide = async (projectId: string, canvasId: string): Promise<TCanvasState["canvas"]> => {
    try {
      const { data } = await api.post(`/projects/${projectId}/slides/${canvasId}/duplicate`);
      return CanvasSchema.parse((data as { slide: unknown }).slide);
    } catch (error) {
      throw toServiceError(error, "Failed to duplicate slide");
    }
  };

  /** Non-socket fallback for reordering slides. */
  reorderSlides = async (projectId: string, order: TSlideOrderEntry[]): Promise<void> => {
    try {
      await api.patch(`/projects/${projectId}/slides/reorder`, { order });
    } catch (error) {
      throw toServiceError(error, "Failed to reorder slides");
    }
  };

  /** Non-socket fallback for deleting a slide. */
  deleteSlide = async (projectId: string, canvasId: string): Promise<void> => {
    try {
      await api.delete(`/projects/${projectId}/slides/${canvasId}`);
    } catch (error) {
      throw toServiceError(error, "Failed to delete slide");
    }
  };
}

export const canvasService = CanvasService.getInstance();

import { api } from "@/services/api";
import type { TAspectRatioPreset } from "./canvas.constants";
import { CanvasStateSchema, CanvasUpdateResponseSchema, type TCanvas, type TCanvasState } from "./canvas.types";

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
   * Initial editor load. The server serves this through its live cache, so an
   * element a peer moved a moment ago arrives at its current position rather
   * than its last-flushed one.
   */
  getCanvas = async (projectId: string): Promise<TCanvasState> => {
    try {
      const { data } = await api.get(`/projects/${projectId}/canvas`);
      return CanvasStateSchema.parse(data);
    } catch (error) {
      throw toServiceError(error, "Failed to load canvas");
    }
  };

  /** Fallback for changing workspace settings when the socket is unavailable. */
  updateCanvas = async (
    projectId: string,
    patch: {
      width?: number;
      height?: number;
      aspectRatioPreset?: TAspectRatioPreset;
      backgroundColor?: string;
    },
  ): Promise<TCanvas> => {
    try {
      const { data } = await api.patch(`/projects/${projectId}/canvas`, patch);
      return CanvasUpdateResponseSchema.parse(data).canvas;
    } catch (error) {
      throw toServiceError(error, "Failed to update canvas");
    }
  };
}

export const canvasService = CanvasService.getInstance();

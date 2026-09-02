import type { TAspectRatioPreset } from "@/services/canvas/canvas.constants";
import type {
  TCanvas,
  TCanvasElement,
  TElementCreateInput,
  TElementOrderEntry,
  TElementPatch,
  TSlideOrderEntry,
} from "@/services/canvas/canvas.types";
import type { TProjectMemberRole } from "@/services/projects/projects.types";
import type { TProjectMedia } from "@/services/media/media.types";
import type { TSocketErrorCode } from "./socket.constants";

/** Mirror of `canva-backend/src/socket/socket.types.ts`. Change both together. */

export type TPresenceMember = {
  /** Presence is per-socket: two tabs are two cursors but one person. */
  socketId: string;
  userId: string;
  username: string;
  avatarUrl: string | null;
  accessibility: TProjectMemberRole;
  color: string;
  /** The slide this socket currently has open — lets peers scope cursors to a shared slide. */
  activeCanvasId: string;
};

export type TAck<T> = { ok: true; data: T } | { ok: false; code: TSocketErrorCode; error: string };

export type TJoinResult = {
  /** Every slide's metadata, ordered. */
  slides: TCanvas[];
  activeCanvasId: string;
  /** Only the active slide's elements — everything else is fetched lazily via `slide:activate`. */
  elements: TCanvasElement[];
  members: TPresenceMember[];
  accessibility: TProjectMemberRole;
  selfSocketId: string;
};

export type TServerToClientEvents = {
  "presence:sync": (payload: { projectId: string; members: TPresenceMember[] }) => void;
  "presence:joined": (payload: { projectId: string; member: TPresenceMember }) => void;
  "presence:left": (payload: { projectId: string; socketId: string; userId: string }) => void;

  "cursor:moved": (payload: { projectId: string; socketId: string; userId: string; x: number; y: number }) => void;
  "selection:changed": (payload: { projectId: string; socketId: string; elementIds: string[] }) => void;
  "presence:activeSlideChanged": (payload: { projectId: string; socketId: string; canvasId: string }) => void;

  "media:uploaded": (payload: { projectId: string; socketId: string; media: TProjectMedia }) => void;
  "media:deleted": (payload: { projectId: string; socketId: string; mediaId: string }) => void;

  "slide:created": (payload: {
    projectId: string;
    socketId: string;
    slide: TCanvas;
    order: TSlideOrderEntry[];
  }) => void;
  "slide:duplicated": (payload: {
    projectId: string;
    socketId: string;
    slide: TCanvas;
    elements: TCanvasElement[];
    order: TSlideOrderEntry[];
  }) => void;
  "slide:reordered": (payload: { projectId: string; socketId: string; order: TSlideOrderEntry[] }) => void;
  "slide:deleted": (payload: { projectId: string; socketId: string; canvasId: string }) => void;

  "element:created": (payload: {
    projectId: string;
    canvasId: string;
    socketId: string;
    element: TCanvasElement;
  }) => void;
  "element:updated": (payload: {
    projectId: string;
    canvasId: string;
    socketId: string;
    elementId: string;
    version: number;
    patch: TElementPatch;
  }) => void;
  "element:deleted": (payload: { projectId: string; canvasId: string; socketId: string; elementIds: string[] }) => void;
  "element:reordered": (payload: {
    projectId: string;
    canvasId: string;
    socketId: string;
    order: TElementOrderEntry[];
  }) => void;
  "element:synced": (payload: { projectId: string; canvasId: string; element: TCanvasElement }) => void;

  "canvas:resized": (payload: { projectId: string; canvasId: string; socketId: string; canvas: TCanvas }) => void;

  "access:changed": (payload: { projectId: string; accessibility: TProjectMemberRole }) => void;
  "access:revoked": (payload: { projectId: string }) => void;

  "socket:error": (payload: { code: TSocketErrorCode; error: string }) => void;
};

export type TClientToServerEvents = {
  "canvas:join": (
    payload: { projectId: string; activeCanvasId?: string },
    ack: (result: TAck<TJoinResult>) => void,
  ) => void;
  "canvas:leave": (payload: { projectId: string }) => void;

  "cursor:move": (payload: { projectId: string; x: number; y: number }) => void;
  "selection:change": (payload: { projectId: string; elementIds: string[] }) => void;
  "presence:activeSlide": (payload: { projectId: string; canvasId: string }) => void;

  "slide:activate": (
    payload: { projectId: string; canvasId: string },
    ack: (result: TAck<{ elements: TCanvasElement[] }>) => void,
  ) => void;

  "slide:create": (
    payload: { projectId: string; canvasId: string; afterCanvasId?: string },
    ack: (result: TAck<{ slide: TCanvas; order: TSlideOrderEntry[] }>) => void,
  ) => void;

  "slide:duplicate": (
    payload: { projectId: string; canvasId: string },
    ack: (result: TAck<{ slide: TCanvas; elements: TCanvasElement[]; order: TSlideOrderEntry[] }>) => void,
  ) => void;

  "slide:reorder": (
    payload: { projectId: string; order: TSlideOrderEntry[] },
    ack: (result: TAck<{ order: TSlideOrderEntry[] }>) => void,
  ) => void;

  "slide:delete": (
    payload: { projectId: string; canvasId: string },
    ack: (result: TAck<{ canvasId: string }>) => void,
  ) => void;

  "element:create": (
    payload: { projectId: string; canvasId: string; element: TElementCreateInput },
    ack: (result: TAck<{ element: TCanvasElement }>) => void,
  ) => void;

  "element:update": (
    payload: { projectId: string; canvasId: string; elementId: string; baseVersion: number; patch: TElementPatch },
    ack: (result: TAck<{ version: number }>) => void,
  ) => void;

  "element:delete": (
    payload: { projectId: string; canvasId: string; elementIds: string[] },
    ack: (result: TAck<{ elementIds: string[] }>) => void,
  ) => void;

  "element:reorder": (
    payload: { projectId: string; canvasId: string; order: TElementOrderEntry[] },
    ack: (result: TAck<{ order: TElementOrderEntry[] }>) => void,
  ) => void;

  "canvas:resize": (
    payload: {
      projectId: string;
      canvasId: string;
      width: number;
      height: number;
      aspectRatioPreset: TAspectRatioPreset;
    },
    ack: (result: TAck<{ canvas: TCanvas }>) => void,
  ) => void;
};

import type { TAspectRatioPreset } from "@/services/canvas/canvas.constants";
import type {
  TCanvas,
  TCanvasElement,
  TElementCreateInput,
  TElementOrderEntry,
  TElementPatch,
} from "@/services/canvas/canvas.types";
import type { TProjectMemberRole } from "@/services/projects/projects.types";
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
};

export type TAck<T> = { ok: true; data: T } | { ok: false; code: TSocketErrorCode; error: string };

export type TJoinResult = {
  canvas: TCanvas;
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

  "element:created": (payload: { projectId: string; socketId: string; element: TCanvasElement }) => void;
  "element:updated": (payload: {
    projectId: string;
    socketId: string;
    elementId: string;
    version: number;
    patch: TElementPatch;
  }) => void;
  "element:deleted": (payload: { projectId: string; socketId: string; elementIds: string[] }) => void;
  "element:reordered": (payload: { projectId: string; socketId: string; order: TElementOrderEntry[] }) => void;
  "element:synced": (payload: { projectId: string; element: TCanvasElement }) => void;

  "canvas:resized": (payload: { projectId: string; socketId: string; canvas: TCanvas }) => void;

  "access:changed": (payload: { projectId: string; accessibility: TProjectMemberRole }) => void;
  "access:revoked": (payload: { projectId: string }) => void;

  "socket:error": (payload: { code: TSocketErrorCode; error: string }) => void;
};

export type TClientToServerEvents = {
  "canvas:join": (payload: { projectId: string }, ack: (result: TAck<TJoinResult>) => void) => void;
  "canvas:leave": (payload: { projectId: string }) => void;

  "cursor:move": (payload: { projectId: string; x: number; y: number }) => void;
  "selection:change": (payload: { projectId: string; elementIds: string[] }) => void;

  "element:create": (
    payload: { projectId: string; element: TElementCreateInput },
    ack: (result: TAck<{ element: TCanvasElement }>) => void,
  ) => void;

  "element:update": (
    payload: { projectId: string; elementId: string; baseVersion: number; patch: TElementPatch },
    ack: (result: TAck<{ version: number }>) => void,
  ) => void;

  "element:delete": (
    payload: { projectId: string; elementIds: string[] },
    ack: (result: TAck<{ elementIds: string[] }>) => void,
  ) => void;

  "element:reorder": (
    payload: { projectId: string; order: TElementOrderEntry[] },
    ack: (result: TAck<{ order: TElementOrderEntry[] }>) => void,
  ) => void;

  "canvas:resize": (
    payload: { projectId: string; width: number; height: number; aspectRatioPreset: TAspectRatioPreset },
    ack: (result: TAck<{ canvas: TCanvas }>) => void,
  ) => void;
};

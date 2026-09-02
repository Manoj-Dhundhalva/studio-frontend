/** Event names. Must stay in step with the backend's `socket.types.ts`. */
export const SOCKET_EVENT = {
  CLIENT: {
    CANVAS_JOIN: "canvas:join",
    CANVAS_LEAVE: "canvas:leave",
    CURSOR_MOVE: "cursor:move",
    SELECTION_CHANGE: "selection:change",
    PRESENCE_ACTIVE_SLIDE: "presence:activeSlide",
    SLIDE_ACTIVATE: "slide:activate",
    SLIDE_CREATE: "slide:create",
    SLIDE_DUPLICATE: "slide:duplicate",
    SLIDE_REORDER: "slide:reorder",
    SLIDE_DELETE: "slide:delete",
    ELEMENT_CREATE: "element:create",
    ELEMENT_UPDATE: "element:update",
    ELEMENT_DELETE: "element:delete",
    ELEMENT_REORDER: "element:reorder",
    CANVAS_RESIZE: "canvas:resize",
  },
  SERVER: {
    PRESENCE_SYNC: "presence:sync",
    PRESENCE_JOINED: "presence:joined",
    PRESENCE_LEFT: "presence:left",
    CURSOR_MOVED: "cursor:moved",
    SELECTION_CHANGED: "selection:changed",
    PRESENCE_ACTIVE_SLIDE_CHANGED: "presence:activeSlideChanged",
    MEDIA_UPLOADED: "media:uploaded",
    MEDIA_DELETED: "media:deleted",
    AI_MESSAGE_CREATED: "ai:messageCreated",
    SLIDE_CREATED: "slide:created",
    SLIDE_DUPLICATED: "slide:duplicated",
    SLIDE_REORDERED: "slide:reordered",
    SLIDE_DELETED: "slide:deleted",
    ELEMENT_CREATED: "element:created",
    ELEMENT_UPDATED: "element:updated",
    ELEMENT_DELETED: "element:deleted",
    ELEMENT_REORDERED: "element:reordered",
    ELEMENT_SYNCED: "element:synced",
    CANVAS_RESIZED: "canvas:resized",
    ACCESS_CHANGED: "access:changed",
    ACCESS_REVOKED: "access:revoked",
    SOCKET_ERROR: "socket:error",
  },
} as const;

export const SOCKET_STATUS = {
  IDLE: "idle",
  CONNECTING: "connecting",
  CONNECTED: "connected",
  RECONNECTING: "reconnecting",
  DISCONNECTED: "disconnected",
} as const;

export type TSocketStatus = (typeof SOCKET_STATUS)[keyof typeof SOCKET_STATUS];

export const SOCKET_ERROR_CODE = {
  UNAUTHENTICATED: "UNAUTHENTICATED",
  FORBIDDEN: "FORBIDDEN",
  NOT_FOUND: "NOT_FOUND",
  NOT_IN_ROOM: "NOT_IN_ROOM",
  INVALID_PAYLOAD: "INVALID_PAYLOAD",
  LIMIT_EXCEEDED: "LIMIT_EXCEEDED",
  DUPLICATE_ID: "DUPLICATE_ID",
  VERSION_CONFLICT: "VERSION_CONFLICT",
  INVALID_OPERATION: "INVALID_OPERATION",
  INTERNAL: "INTERNAL",
} as const;

export type TSocketErrorCode = (typeof SOCKET_ERROR_CODE)[keyof typeof SOCKET_ERROR_CODE];

/**
 * How long `leave()` waits before actually disconnecting.
 *
 * React 19 StrictMode (and dev remounts) run mount → unmount → mount back to
 * back. Tearing down synchronously would kill a socket the very next mount
 * immediately re-establishes: a wasted handshake, a spurious presence:left
 * broadcast to every peer, and a lost join ack. Deferring lets the remount
 * cancel the teardown instead.
 */
export const SOCKET_TEARDOWN_DELAY_MS = 250;

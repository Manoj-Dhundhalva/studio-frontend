import { io, type Socket } from "socket.io-client";
import { env } from "@/config/env";
import { SOCKET_EVENT, SOCKET_STATUS, SOCKET_TEARDOWN_DELAY_MS, type TSocketStatus } from "./socket.constants";
import type { TClientToServerEvents, TServerToClientEvents } from "./socket.types";

type TTypedSocket = Socket<TServerToClientEvents, TClientToServerEvents>;

type TStatusListener = (status: TSocketStatus) => void;

/** A listener kept so it can be re-bound after a reconnect. */
type TRegisteredListener = { event: string; handler: (...args: never[]) => void };

/**
 * The realtime connection.
 *
 * A singleton service rather than a React context, matching `apiService` and
 * `authService`, and for a concrete reason: socket listeners have to reach the
 * Redux store and the cursor store, neither of which is a React concern, and
 * the navbar's presence UI lives in a layout *above* the route that owns the
 * project id — so a page-level provider could not serve it.
 */
class SocketService {
  private static instance: SocketService;

  private socket: TTypedSocket | null = null;
  private getAuthToken: (() => string | null) | null = null;
  private onUnauthorized: (() => void) | null = null;

  private status: TSocketStatus = SOCKET_STATUS.IDLE;
  private readonly statusListeners = new Set<TStatusListener>();
  private readonly listeners = new Set<TRegisteredListener>();

  /**
   * Rooms this client wants to be in, with a reference count. StrictMode
   * double-invokes effects, so a naive join/leave pair would connect and
   * disconnect on every mount.
   */
  private readonly roomRefCounts = new Map<string, number>();
  private teardownTimer: ReturnType<typeof setTimeout> | null = null;

  private constructor() {}

  static getInstance(): SocketService {
    if (!SocketService.instance) {
      SocketService.instance = new SocketService();
    }
    return SocketService.instance;
  }

  /** Same seam as `ApiService.configureAuth`, keeping this module auth-agnostic. */
  configureAuth(getToken: () => string | null, onUnauthorized?: () => void): void {
    this.getAuthToken = getToken;
    this.onUnauthorized = onUnauthorized ?? null;
  }

  get id(): string | null {
    return this.socket?.id ?? null;
  }

  getStatus(): TSocketStatus {
    return this.status;
  }

  subscribeStatus(listener: TStatusListener): () => void {
    this.statusListeners.add(listener);
    listener(this.status);

    return () => {
      this.statusListeners.delete(listener);
    };
  }

  private setStatus(status: TSocketStatus): void {
    if (this.status === status) {
      return;
    }

    this.status = status;
    this.statusListeners.forEach((listener) => listener(status));
  }

  private connect(): void {
    if (this.socket) {
      return;
    }

    this.setStatus(SOCKET_STATUS.CONNECTING);

    this.socket = io(env.VITE_SOCKET_URL, {
      // A function, so the token is read fresh on every reconnect attempt — a
      // token replaced in another tab is picked up without a page reload.
      auth: (callback: (data: { token: string | null }) => void) => {
        callback({ token: this.getAuthToken?.() ?? null });
      },
      reconnection: true,
      reconnectionDelay: 500,
      reconnectionDelayMax: 5000,
      timeout: 10000,
    });

    // Re-bind anything registered while disconnected.
    this.listeners.forEach(({ event, handler }) => {
      this.socket?.on(event as keyof TServerToClientEvents, handler as never);
    });

    this.socket.on("connect", () => {
      this.setStatus(SOCKET_STATUS.CONNECTED);

      // On a reconnect the server has no memory of this new socket id, so every
      // room still referenced must be re-joined.
      this.roomRefCounts.forEach((_count, projectId) => {
        this.socket?.emit(SOCKET_EVENT.CLIENT.CANVAS_JOIN, { projectId }, () => {
          // The join ack is consumed by `useCanvasRoom`; here it only matters
          // that the room was re-entered.
        });
      });
    });

    this.socket.io.on("reconnect_attempt", () => this.setStatus(SOCKET_STATUS.RECONNECTING));
    this.socket.on("disconnect", () => this.setStatus(SOCKET_STATUS.DISCONNECTED));

    this.socket.on("connect_error", (error: Error) => {
      // The server's handshake middleware sends its Error message verbatim, so
      // a rejected token must be treated like a REST 401.
      if (error.message === "UNAUTHENTICATED") {
        this.onUnauthorized?.();
      }

      this.setStatus(SOCKET_STATUS.DISCONNECTED);
    });
  }

  join(projectId: string): void {
    if (this.teardownTimer) {
      clearTimeout(this.teardownTimer);
      this.teardownTimer = null;
    }

    this.roomRefCounts.set(projectId, (this.roomRefCounts.get(projectId) ?? 0) + 1);
    this.connect();
  }

  leave(projectId: string): void {
    const next = (this.roomRefCounts.get(projectId) ?? 1) - 1;

    if (next > 0) {
      this.roomRefCounts.set(projectId, next);
      return;
    }

    this.roomRefCounts.delete(projectId);

    this.teardownTimer = setTimeout(() => {
      this.teardownTimer = null;

      if (this.roomRefCounts.size === 0) {
        this.disconnect();
        return;
      }

      this.socket?.emit(SOCKET_EVENT.CLIENT.CANVAS_LEAVE, { projectId });
    }, SOCKET_TEARDOWN_DELAY_MS);
  }

  private disconnect(): void {
    this.socket?.disconnect();
    this.socket = null;
    this.setStatus(SOCKET_STATUS.IDLE);
  }

  /** Registers a listener and returns its unsubscribe. */
  on<E extends keyof TServerToClientEvents>(event: E, handler: TServerToClientEvents[E]): () => void {
    const entry: TRegisteredListener = { event, handler: handler as (...args: never[]) => void };

    this.listeners.add(entry);
    this.socket?.on(event, handler as never);

    return () => {
      this.listeners.delete(entry);
      this.socket?.off(event, handler as never);
    };
  }

  /**
   * Fire-and-forget emit. A dropped cursor frame while disconnected is correct
   * behaviour; mutations are protected instead by socket.io's own outbound
   * buffering, and on a long outage the re-join snapshot supersedes anything
   * queued.
   */
  emit<E extends keyof TClientToServerEvents>(event: E, ...args: Parameters<TClientToServerEvents[E]>): void {
    this.socket?.emit(event, ...(args as never));
  }
}

export const socketService = SocketService.getInstance();

import type { TPoint } from "@/services/canvas/canvas.types";

type TCursorListener = (socketId: string, point: TPoint | null) => void;

/**
 * Remote cursor positions, deliberately kept out of Redux.
 *
 * `cursor:moved` arrives at up to ~60/s *per peer*. Routing that through the
 * store would mean an action through the middleware chain, an Immer draft, a
 * store notification and an equality pass in every subscribed component, for
 * every frame — hundreds of dispatches a second with a handful of
 * collaborators. It would also bury the actual shape mutations in the DevTools
 * action log, which is where they most need to stay readable.
 *
 * Listeners are handed the *changed* socketId rather than a snapshot, so the
 * consumer can move one Konva node imperatively instead of diffing a map. That
 * is also why this is not a `useSyncExternalStore` source: that would still
 * schedule a React render per notification, and would need a referentially
 * stable snapshot, which a mutating Map cannot provide without cloning on every
 * write — trading Redux's cost for React's at the same frequency.
 */
class CursorStore {
  private static instance: CursorStore;

  private readonly positions = new Map<string, TPoint>();
  private readonly listeners = new Set<TCursorListener>();

  private constructor() {}

  static getInstance(): CursorStore {
    if (!CursorStore.instance) {
      CursorStore.instance = new CursorStore();
    }
    return CursorStore.instance;
  }

  set = (socketId: string, point: TPoint): void => {
    this.positions.set(socketId, point);
    this.listeners.forEach((listener) => listener(socketId, point));
  };

  remove = (socketId: string): void => {
    this.positions.delete(socketId);
    this.listeners.forEach((listener) => listener(socketId, null));
  };

  get = (socketId: string): TPoint | null => this.positions.get(socketId) ?? null;

  clear = (): void => {
    const socketIds = [...this.positions.keys()];
    this.positions.clear();
    socketIds.forEach((socketId) => {
      this.listeners.forEach((listener) => listener(socketId, null));
    });
  };

  subscribe = (listener: TCursorListener): (() => void) => {
    this.listeners.add(listener);

    return () => {
      this.listeners.delete(listener);
    };
  };
}

export const cursorStore = CursorStore.getInstance();

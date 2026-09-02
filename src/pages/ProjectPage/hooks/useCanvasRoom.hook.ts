import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useStore } from "react-redux";
import { ROUTE_PATH } from "@/constants/route.constants";
import { SYNC_STATUS } from "@/services/canvas/canvas.constants";
import { authService } from "@/services/auth";
import { cursorStore, SOCKET_EVENT, SOCKET_STATUS, socketService } from "@/services/socket";
import { useAppDispatch } from "@/store";
import {
  canvasHydrated,
  canvasReplaced,
  canvasReset,
  elementPatched,
  elementSynced,
  elementUpserted,
  elementsRemoved,
  elementsReordered,
  selectElement,
  syncStatusChanged,
} from "@/store/slices/canvas.slice";
import {
  presenceJoined,
  presenceLeft,
  presenceReset,
  presenceRoleChanged,
  presenceSynced,
} from "@/store/slices/presence.slice";
import { memberAccessibilitySet, memberRemoved } from "@/store/slices/members.slice";
import { projectAccessibilitySet, resetProject } from "@/store/slices/project.slice";
import { selectCurrentUser } from "@/store/slices/user.slice";
import type { RootState } from "@/store/store";
import { utils } from "@/utils";

/**
 * Configured at module scope, not in an effect: idempotent, race-free (it runs
 * before any component in this chunk mounts), and it keeps socket.io out of the
 * entry bundle — wiring this in `boot/index.ts` would load it for every user,
 * including those who never open a project.
 */
socketService.configureAuth(authService.getToken);

/** Remote selections, kept out of Redux for the same reason as cursors. */
export type TRemoteSelections = Record<string, string[]>;

/**
 * Joins the project room and routes every server event into the store.
 *
 * Returns the remote-selection map, which is low-frequency enough to keep in
 * component state but not worth a store round-trip.
 */
export const useCanvasRoom = (projectId: string): { remoteSelections: TRemoteSelections } => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const store = useStore<RootState>();
  const [remoteSelections, setRemoteSelections] = useState<TRemoteSelections>({});

  /**
   * Read from the store at event time rather than mirrored into a ref: these
   * handlers already hold `store`, and the current user cannot change without
   * the whole app remounting.
   */
  const getSelfUserId = useCallback((): string | null => selectCurrentUser(store.getState())?.userId ?? null, [store]);

  useEffect(() => {
    const unsubscribers: (() => void)[] = [];

    // ---------------------------------------------------------- connection
    unsubscribers.push(
      socketService.subscribeStatus((status) => {
        if (status === SOCKET_STATUS.RECONNECTING || status === SOCKET_STATUS.DISCONNECTED) {
          dispatch(syncStatusChanged({ projectId, syncStatus: SYNC_STATUS.RECONNECTING }));
          return;
        }

        if (status === SOCKET_STATUS.CONNECTED) {
          dispatch(syncStatusChanged({ projectId, syncStatus: SYNC_STATUS.SYNCED }));
        }
      }),
    );

    // ------------------------------------------------------------ presence
    unsubscribers.push(
      socketService.on(SOCKET_EVENT.SERVER.PRESENCE_SYNC, (payload) => {
        if (payload.projectId !== projectId) return;
        dispatch(presenceSynced({ projectId, members: payload.members }));
      }),
    );

    unsubscribers.push(
      socketService.on(SOCKET_EVENT.SERVER.PRESENCE_JOINED, (payload) => {
        if (payload.projectId !== projectId) return;
        dispatch(presenceJoined({ projectId, member: payload.member }));
      }),
    );

    unsubscribers.push(
      socketService.on(SOCKET_EVENT.SERVER.PRESENCE_LEFT, (payload) => {
        if (payload.projectId !== projectId) return;

        dispatch(presenceLeft({ projectId, socketId: payload.socketId }));
        // Their cursor and selection outline must go with them.
        cursorStore.remove(payload.socketId);
        setRemoteSelections((current) => {
          const next = { ...current };
          delete next[payload.socketId];
          return next;
        });
      }),
    );

    // -------------------------------------------------------------- cursors
    unsubscribers.push(
      socketService.on(SOCKET_EVENT.SERVER.CURSOR_MOVED, (payload) => {
        if (payload.projectId !== projectId) return;
        // Straight into the external store — never a dispatch.
        cursorStore.set(payload.socketId, { x: payload.x, y: payload.y });
      }),
    );

    unsubscribers.push(
      socketService.on(SOCKET_EVENT.SERVER.SELECTION_CHANGED, (payload) => {
        if (payload.projectId !== projectId) return;
        setRemoteSelections((current) => ({ ...current, [payload.socketId]: payload.elementIds }));
      }),
    );

    // ------------------------------------------------------------- elements
    unsubscribers.push(
      socketService.on(SOCKET_EVENT.SERVER.ELEMENT_CREATED, (payload) => {
        if (payload.projectId !== projectId || payload.socketId === socketService.id) return;
        dispatch(elementUpserted({ projectId, element: payload.element }));
      }),
    );

    unsubscribers.push(
      socketService.on(SOCKET_EVENT.SERVER.ELEMENT_UPDATED, (payload) => {
        if (payload.projectId !== projectId) return;

        // Own echo: applying a server value that is a frame or two behind is
        // what produces the classic rubber-band snap-back mid-drag.
        if (payload.socketId === socketService.id) return;

        // Per-element last-write-wins. Socket.IO preserves per-socket ordering
        // but not ordering across sockets, and a reconnect can replay, so a
        // lower-or-equal version is stale by definition.
        const local = selectElement(store.getState(), projectId, payload.elementId);

        if (local && payload.version <= local.version) return;

        dispatch(
          elementPatched({ projectId, elementId: payload.elementId, patch: payload.patch, version: payload.version }),
        );
      }),
    );

    unsubscribers.push(
      socketService.on(SOCKET_EVENT.SERVER.ELEMENT_DELETED, (payload) => {
        if (payload.projectId !== projectId || payload.socketId === socketService.id) return;
        dispatch(elementsRemoved({ projectId, elementIds: payload.elementIds }));
      }),
    );

    unsubscribers.push(
      socketService.on(SOCKET_EVENT.SERVER.ELEMENT_REORDERED, (payload) => {
        if (payload.projectId !== projectId || payload.socketId === socketService.id) return;
        dispatch(elementsReordered({ projectId, order: payload.order }));
      }),
    );

    // The authoritative element after losing a version race — applied
    // unconditionally, ignoring both version and origin.
    unsubscribers.push(
      socketService.on(SOCKET_EVENT.SERVER.ELEMENT_SYNCED, (payload) => {
        if (payload.projectId !== projectId) return;
        dispatch(elementSynced({ projectId, element: payload.element }));
      }),
    );

    unsubscribers.push(
      socketService.on(SOCKET_EVENT.SERVER.CANVAS_RESIZED, (payload) => {
        if (payload.projectId !== projectId || payload.socketId === socketService.id) return;
        dispatch(canvasReplaced({ projectId, canvas: payload.canvas }));
      }),
    );

    // -------------------------------------------------------- permissions
    unsubscribers.push(
      socketService.on(SOCKET_EVENT.SERVER.ACCESS_CHANGED, (payload) => {
        if (payload.projectId !== projectId) return;

        // The server only sends this to the affected user's own sockets.
        dispatch(projectAccessibilitySet({ projectId, accessibility: payload.accessibility }));

        const userId = getSelfUserId();

        if (userId) {
          dispatch(presenceRoleChanged({ projectId, userId, accessibility: payload.accessibility }));
          dispatch(memberAccessibilitySet({ projectId, userId, accessibility: payload.accessibility }));
        }

        if (payload.accessibility === "viewer") {
          utils.toast.warning("Your access changed to view-only.");
          return;
        }

        utils.toast.success(`Your access changed to ${payload.accessibility}.`);
      }),
    );

    unsubscribers.push(
      socketService.on(SOCKET_EVENT.SERVER.ACCESS_REVOKED, (payload) => {
        if (payload.projectId !== projectId) return;

        utils.toast.error("You no longer have access to this project.");

        const userId = getSelfUserId();

        if (userId) {
          dispatch(memberRemoved({ projectId, userId }));
        }

        dispatch(canvasReset(projectId));
        dispatch(presenceReset(projectId));
        dispatch(resetProject(projectId));
        cursorStore.clear();

        // `replace` so the revoked project isn't one Back away.
        void navigate(ROUTE_PATH.HOME.ROOT, { replace: true });
      }),
    );

    unsubscribers.push(
      socketService.on(SOCKET_EVENT.SERVER.SOCKET_ERROR, (payload) => {
        console.error("Socket error", payload);
      }),
    );

    // ----------------------------------------------------------- join room
    socketService.join(projectId);

    /**
     * The join is emitted here rather than inside the service so the ack — the
     * full authoritative snapshot — lands in the store. Emitted on every
     * connect, including reconnects, because the server has no memory of a new
     * socket id.
     */
    const requestState = (): void => {
      socketService.emit(SOCKET_EVENT.CLIENT.CANVAS_JOIN, { projectId }, (result) => {
        if (!result.ok) {
          utils.toast.error(result.error);
          return;
        }

        dispatch(canvasHydrated({ projectId, canvas: result.data.canvas, elements: result.data.elements }));
        dispatch(
          presenceSynced({
            projectId,
            members: result.data.members,
            selfSocketId: result.data.selfSocketId,
          }),
        );
        dispatch(projectAccessibilitySet({ projectId, accessibility: result.data.accessibility }));
      });
    };

    unsubscribers.push(
      socketService.subscribeStatus((status) => {
        if (status === SOCKET_STATUS.CONNECTED) {
          requestState();
        }
      }),
    );

    return () => {
      unsubscribers.forEach((unsubscribe) => unsubscribe());
      socketService.leave(projectId);
      cursorStore.clear();
    };
  }, [dispatch, navigate, projectId, store, getSelfUserId]);

  return { remoteSelections };
};

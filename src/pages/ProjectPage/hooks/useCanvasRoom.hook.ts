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
  selectSlides,
  slideRemoved,
  slideUpserted,
  slidesHydrated,
  slidesReordered,
  slidesReset,
} from "@/store/slices/slides.slice";
import {
  presenceActiveSlideChanged,
  presenceJoined,
  presenceLeft,
  presenceReset,
  presenceRoleChanged,
  presenceSynced,
} from "@/store/slices/presence.slice";
import { memberAccessibilitySet, memberRemoved } from "@/store/slices/members.slice";
import { mediaAdded, mediaRemoved, mediaReset } from "@/store/slices/media.slice";
import { aiMessageAdded, aiReset } from "@/store/slices/ai.slice";
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
 * Every element/canvas-resize broadcast is applied by its own `canvasId`
 * unconditionally — not gated on "is this the currently active slide" — so
 * every slide's Redux entity (and therefore its thumbnail) stays live
 * regardless of which one the user is looking at.
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
          dispatch(syncStatusChanged({ canvasId: projectId, syncStatus: SYNC_STATUS.RECONNECTING }));
          return;
        }

        if (status === SOCKET_STATUS.CONNECTED) {
          dispatch(syncStatusChanged({ canvasId: projectId, syncStatus: SYNC_STATUS.SYNCED }));
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

    unsubscribers.push(
      socketService.on(SOCKET_EVENT.SERVER.PRESENCE_ACTIVE_SLIDE_CHANGED, (payload) => {
        if (payload.projectId !== projectId) return;
        dispatch(presenceActiveSlideChanged({ projectId, socketId: payload.socketId, canvasId: payload.canvasId }));
      }),
    );

    // ---------------------------------------------------------------- media
    unsubscribers.push(
      socketService.on(SOCKET_EVENT.SERVER.MEDIA_UPLOADED, (payload) => {
        if (payload.projectId !== projectId) return;
        dispatch(mediaAdded({ projectId, media: payload.media }));
      }),
    );

    unsubscribers.push(
      socketService.on(SOCKET_EVENT.SERVER.MEDIA_DELETED, (payload) => {
        if (payload.projectId !== projectId) return;
        dispatch(mediaRemoved({ projectId, mediaId: payload.mediaId }));
      }),
    );

    // ------------------------------------------------------------------- ai
    unsubscribers.push(
      socketService.on(SOCKET_EVENT.SERVER.AI_MESSAGE_CREATED, (payload) => {
        if (payload.projectId !== projectId) return;
        dispatch(aiMessageAdded({ projectId, message: payload.message }));
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

    // --------------------------------------------------------------- slides
    unsubscribers.push(
      socketService.on(SOCKET_EVENT.SERVER.SLIDE_CREATED, (payload) => {
        if (payload.projectId !== projectId || payload.socketId === socketService.id) return;
        dispatch(slideUpserted({ projectId, slide: payload.slide }));
        // Inserting anywhere but the end shifts every later sibling's `orderIndex`.
        dispatch(slidesReordered({ projectId, order: payload.order }));
      }),
    );

    unsubscribers.push(
      socketService.on(SOCKET_EVENT.SERVER.SLIDE_DUPLICATED, (payload) => {
        if (payload.projectId !== projectId || payload.socketId === socketService.id) return;
        dispatch(slideUpserted({ projectId, slide: payload.slide }));
        // Seed the copy's elements too, so its thumbnail renders without a
        // separate `slide:activate` round trip.
        dispatch(
          canvasHydrated({ canvasId: payload.slide.canvasId, canvas: payload.slide, elements: payload.elements }),
        );
        dispatch(slidesReordered({ projectId, order: payload.order }));
      }),
    );

    unsubscribers.push(
      socketService.on(SOCKET_EVENT.SERVER.SLIDE_REORDERED, (payload) => {
        if (payload.projectId !== projectId || payload.socketId === socketService.id) return;
        dispatch(slidesReordered({ projectId, order: payload.order }));
      }),
    );

    unsubscribers.push(
      socketService.on(SOCKET_EVENT.SERVER.SLIDE_DELETED, (payload) => {
        if (payload.projectId !== projectId || payload.socketId === socketService.id) return;
        dispatch(slideRemoved({ projectId, canvasId: payload.canvasId }));
        dispatch(canvasReset(payload.canvasId));
      }),
    );

    // ------------------------------------------------------------- elements
    unsubscribers.push(
      socketService.on(SOCKET_EVENT.SERVER.ELEMENT_CREATED, (payload) => {
        if (payload.projectId !== projectId || payload.socketId === socketService.id) return;
        dispatch(elementUpserted({ canvasId: payload.canvasId, element: payload.element }));
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
        const local = selectElement(store.getState(), payload.canvasId, payload.elementId);

        if (local && payload.version <= local.version) return;

        dispatch(
          elementPatched({
            canvasId: payload.canvasId,
            elementId: payload.elementId,
            patch: payload.patch,
            version: payload.version,
          }),
        );
      }),
    );

    unsubscribers.push(
      socketService.on(SOCKET_EVENT.SERVER.ELEMENT_DELETED, (payload) => {
        if (payload.projectId !== projectId || payload.socketId === socketService.id) return;
        dispatch(elementsRemoved({ canvasId: payload.canvasId, elementIds: payload.elementIds }));
      }),
    );

    unsubscribers.push(
      socketService.on(SOCKET_EVENT.SERVER.ELEMENT_REORDERED, (payload) => {
        if (payload.projectId !== projectId || payload.socketId === socketService.id) return;
        dispatch(elementsReordered({ canvasId: payload.canvasId, order: payload.order }));
      }),
    );

    // The authoritative element after losing a version race — applied
    // unconditionally, ignoring both version and origin.
    unsubscribers.push(
      socketService.on(SOCKET_EVENT.SERVER.ELEMENT_SYNCED, (payload) => {
        if (payload.projectId !== projectId) return;
        dispatch(elementSynced({ canvasId: payload.canvasId, element: payload.element }));
      }),
    );

    unsubscribers.push(
      socketService.on(SOCKET_EVENT.SERVER.CANVAS_RESIZED, (payload) => {
        if (payload.projectId !== projectId || payload.socketId === socketService.id) return;
        dispatch(canvasReplaced({ canvasId: payload.canvasId, canvas: payload.canvas }));
        dispatch(slideUpserted({ projectId, slide: payload.canvas }));
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

        selectSlides(store.getState(), projectId).forEach((slide) => dispatch(canvasReset(slide.canvasId)));
        dispatch(slidesReset(projectId));
        dispatch(presenceReset(projectId));
        dispatch(mediaReset(projectId));
        dispatch(aiReset(projectId));
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

        dispatch(slidesHydrated({ projectId, slides: result.data.slides, activeCanvasId: result.data.activeCanvasId }));

        const activeSlide = result.data.slides.find((slide) => slide.canvasId === result.data.activeCanvasId);

        // The server always picks `activeCanvasId` from `slides`, so this is
        // always found in practice; guarded rather than asserted so a future
        // contract change fails soft instead of crashing the join.
        if (activeSlide) {
          dispatch(
            canvasHydrated({
              canvasId: result.data.activeCanvasId,
              canvas: activeSlide,
              elements: result.data.elements,
            }),
          );
        }

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

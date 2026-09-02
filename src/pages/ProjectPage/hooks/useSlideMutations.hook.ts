import { useCallback } from "react";
import { useStore } from "react-redux";
import { SOCKET_EVENT, socketService } from "@/services/socket";
import type { TCanvas, TSlideOrderEntry } from "@/services/canvas/canvas.types";
import { useAppDispatch } from "@/store";
import { canvasHydrated, canvasReset, selectHasSlideEntity } from "@/store/slices/canvas.slice";
import {
  activeSlideChanged,
  selectActiveCanvasId,
  selectSlides,
  slideRemoved,
  slideUpserted,
  slidesReordered,
} from "@/store/slices/slides.slice";
import type { RootState } from "@/store/store";
import { utils } from "@/utils";

type TUseSlideMutationsResult = {
  addSlide: (afterCanvasId?: string) => void;
  duplicateSlide: (canvasId: string) => void;
  reorderSlides: (order: TSlideOrderEntry[]) => void;
  deleteSlide: (canvasId: string) => void;
  switchActiveSlide: (canvasId: string) => void;
  /** Lazily fetches a slide's elements without changing which one is active — for backfilling thumbnails. */
  ensureSlideHydrated: (canvasId: string) => void;
};

/**
 * Slide-structural mutations (add/duplicate/reorder/delete/switch), following
 * `useElementMutations`'s optimistic-then-networked pattern where the
 * operation allows it. `duplicateSlide` is the odd one out — the server mints
 * every copied element's id, so there is nothing safe to render optimistically
 * and it waits for the ack (see the plan's reasoning: this is a discrete
 * click, not a latency-sensitive gesture).
 */
export const useSlideMutations = (projectId: string, canEdit: boolean): TUseSlideMutationsResult => {
  const dispatch = useAppDispatch();
  const store = useStore<RootState>();

  const addSlide = useCallback(
    (afterCanvasId?: string) => {
      if (!canEdit) {
        utils.toast.error("You have view-only access.");
        return;
      }

      const canvasId = crypto.randomUUID();
      const state = store.getState();
      const currentSlides = selectSlides(state, projectId);
      const reference =
        (afterCanvasId ? currentSlides.find((slide) => slide.canvasId === afterCanvasId) : undefined) ??
        currentSlides[currentSlides.length - 1];

      const optimistic: TCanvas = {
        canvasId,
        projectId,
        width: reference?.width ?? 1080,
        height: reference?.height ?? 1080,
        aspectRatioPreset: reference?.aspectRatioPreset ?? null,
        backgroundColor: reference?.backgroundColor ?? "#ffffff",
        version: 0,
        orderIndex: currentSlides.length,
      };
      const previousActiveCanvasId = selectActiveCanvasId(state, projectId);

      dispatch(slideUpserted({ projectId, slide: optimistic }));
      dispatch(canvasHydrated({ canvasId, canvas: optimistic, elements: [] }));
      dispatch(activeSlideChanged({ projectId, canvasId }));

      socketService.emit(
        SOCKET_EVENT.CLIENT.SLIDE_CREATE,
        { projectId, canvasId, ...(afterCanvasId !== undefined ? { afterCanvasId } : {}) },
        (result) => {
          if (!result.ok) {
            dispatch(slideRemoved({ projectId, canvasId }));
            dispatch(canvasReset(canvasId));

            if (previousActiveCanvasId) {
              dispatch(activeSlideChanged({ projectId, canvasId: previousActiveCanvasId }));
            }

            utils.toast.error(result.error);
            return;
          }

          // Adopt the server's row — authoritative `orderIndex`/`version` — and
          // reconcile every sibling too: inserting anywhere but the end shifts
          // their `orderIndex` in the DB, and only this full `order` reflects that.
          dispatch(slideUpserted({ projectId, slide: result.data.slide }));
          dispatch(slidesReordered({ projectId, order: result.data.order }));
        },
      );
    },
    [dispatch, projectId, canEdit, store],
  );

  const duplicateSlide = useCallback(
    (canvasId: string) => {
      if (!canEdit) {
        utils.toast.error("You have view-only access.");
        return;
      }

      socketService.emit(SOCKET_EVENT.CLIENT.SLIDE_DUPLICATE, { projectId, canvasId }, (result) => {
        if (!result.ok) {
          utils.toast.error(result.error);
          return;
        }

        dispatch(slideUpserted({ projectId, slide: result.data.slide }));
        dispatch(
          canvasHydrated({
            canvasId: result.data.slide.canvasId,
            canvas: result.data.slide,
            elements: result.data.elements,
          }),
        );
        dispatch(activeSlideChanged({ projectId, canvasId: result.data.slide.canvasId }));
        // The copy is inserted right after its source, not at the end — every
        // sibling from that point on had its `orderIndex` shifted in the DB, so
        // without this the strip renders out of order until the next reorder/reload.
        dispatch(slidesReordered({ projectId, order: result.data.order }));
      });
    },
    [dispatch, projectId, canEdit],
  );

  const reorderSlides = useCallback(
    (order: TSlideOrderEntry[]) => {
      if (!canEdit || order.length === 0) {
        return;
      }

      const previousOrder = selectSlides(store.getState(), projectId).map((slide) => ({
        canvasId: slide.canvasId,
        orderIndex: slide.orderIndex,
      }));

      dispatch(slidesReordered({ projectId, order }));

      socketService.emit(SOCKET_EVENT.CLIENT.SLIDE_REORDER, { projectId, order }, (result) => {
        if (!result.ok) {
          dispatch(slidesReordered({ projectId, order: previousOrder }));
          utils.toast.error(result.error);
        }
      });
    },
    [dispatch, projectId, canEdit, store],
  );

  const deleteSlide = useCallback(
    (canvasId: string) => {
      if (!canEdit) {
        utils.toast.error("You have view-only access.");
        return;
      }

      const state = store.getState();
      const snapshot = selectSlides(state, projectId).find((slide) => slide.canvasId === canvasId);
      const wasActive = selectActiveCanvasId(state, projectId) === canvasId;

      if (!snapshot) {
        return;
      }

      dispatch(slideRemoved({ projectId, canvasId }));
      dispatch(canvasReset(canvasId));

      // Pick a neighbor before the ack, so the switch feels instant.
      if (wasActive) {
        const remaining = selectSlides(store.getState(), projectId);
        const next = remaining[0];

        if (next) {
          dispatch(activeSlideChanged({ projectId, canvasId: next.canvasId }));
        }
      }

      socketService.emit(SOCKET_EVENT.CLIENT.SLIDE_DELETE, { projectId, canvasId }, (result) => {
        if (result.ok) {
          return;
        }

        dispatch(slideUpserted({ projectId, slide: snapshot }));

        if (wasActive) {
          dispatch(activeSlideChanged({ projectId, canvasId }));
        }

        utils.toast.error(result.error);
      });
    },
    [dispatch, projectId, canEdit, store],
  );

  const ensureSlideHydrated = useCallback(
    (canvasId: string) => {
      if (selectHasSlideEntity(store.getState(), canvasId)) {
        return;
      }

      socketService.emit(SOCKET_EVENT.CLIENT.SLIDE_ACTIVATE, { projectId, canvasId }, (result) => {
        if (!result.ok) {
          return;
        }

        const slide = selectSlides(store.getState(), projectId).find((entry) => entry.canvasId === canvasId);

        if (slide) {
          dispatch(canvasHydrated({ canvasId, canvas: slide, elements: result.data.elements }));
        }
      });
    },
    [dispatch, projectId, store],
  );

  const switchActiveSlide = useCallback(
    (canvasId: string) => {
      const state = store.getState();

      if (selectActiveCanvasId(state, projectId) === canvasId) {
        return;
      }

      // Fire-and-forget, independent of hydration below — peers need to know
      // which slide this socket is on even when it's already cached locally.
      socketService.emit(SOCKET_EVENT.CLIENT.PRESENCE_ACTIVE_SLIDE, { projectId, canvasId });

      if (selectHasSlideEntity(state, canvasId)) {
        dispatch(activeSlideChanged({ projectId, canvasId }));
        return;
      }

      socketService.emit(SOCKET_EVENT.CLIENT.SLIDE_ACTIVATE, { projectId, canvasId }, (result) => {
        if (!result.ok) {
          utils.toast.error(result.error);
          return;
        }

        const slide = selectSlides(store.getState(), projectId).find((entry) => entry.canvasId === canvasId);

        if (slide) {
          dispatch(canvasHydrated({ canvasId, canvas: slide, elements: result.data.elements }));
        }

        dispatch(activeSlideChanged({ projectId, canvasId }));
      });
    },
    [dispatch, projectId, store],
  );

  return { addSlide, duplicateSlide, reorderSlides, deleteSlide, switchActiveSlide, ensureSlideHydrated };
};

import { useCallback, useEffect, useRef } from "react";
import { useStore } from "react-redux";
import { SOCKET_ERROR_CODE, SOCKET_EVENT, socketService } from "@/services/socket";
import type { TAck } from "@/services/socket/socket.types";
import { TRANSFORM_EMIT_INTERVAL_MS } from "@/services/canvas/canvas.constants";
import type {
  TCanvasElement,
  TElementCreateInput,
  TElementOrderEntry,
  TElementPatch,
} from "@/services/canvas/canvas.types";
import { useAppDispatch } from "@/store";
import {
  elementPatched,
  elementSynced,
  elementUpserted,
  elementsRemoved,
  elementsReordered,
  pendingDecremented,
  pendingIncremented,
  selectElement,
  selectionChanged,
} from "@/store/slices/canvas.slice";
import { projectAccessibilitySet } from "@/store/slices/project.slice";
import type { RootState } from "@/store/store";
import { utils } from "@/utils";

type TUseElementMutationsResult = {
  addElement: (input: TElementCreateInput) => void;
  /** Live, throttled update for use during a drag or transform. */
  previewElement: (elementId: string, patch: TElementPatch) => void;
  /** Final authoritative update. Cancels any queued preview first. */
  commitElement: (elementId: string, patch: TElementPatch) => void;
  removeElements: (elementIds: string[]) => void;
  reorderElements: (order: TElementOrderEntry[]) => void;
  setSelection: (elementIds: string[]) => void;
};

/**
 * Applies edits locally first, then sends them.
 *
 * The gesture must never wait on the network, so every mutation writes to Redux
 * immediately and reconciles against the ack. A rejected mutation — most
 * importantly a demotion landing mid-drag — is rolled back from a snapshot
 * taken before the gesture started.
 *
 * Scoped to one slide (`canvasId`) — `projectId` is still needed for the
 * socket payload (every mutation is validated against it server-side), but
 * all Redux reads/writes key off `canvasId`, since a project can hold many.
 */
export const useElementMutations = (
  projectId: string,
  canvasId: string,
  canEdit: boolean,
): TUseElementMutationsResult => {
  const dispatch = useAppDispatch();
  const store = useStore<RootState>();

  /** Pre-gesture snapshots, keyed by element id, for rollback on rejection. */
  const rollbackRef = useRef<Map<string, TCanvasElement | null>>(new Map());

  /**
   * Mirrors `canEdit` so gesture handlers see a demotion that lands *between*
   * dragstart and dragend, rather than the value captured when the handler was
   * created. Written in an effect, not during render, per the react-hooks rules.
   */
  const canEditRef = useRef(canEdit);

  useEffect(() => {
    canEditRef.current = canEdit;
  }, [canEdit]);

  const handleFailure = useCallback(
    (elementId: string | null, result: Extract<TAck<unknown>, { ok: false }>) => {
      dispatch(pendingDecremented({ canvasId }));

      if (elementId !== null) {
        const snapshot = rollbackRef.current.get(elementId);

        if (snapshot === null) {
          // There was nothing there before — undo the optimistic insert.
          dispatch(elementsRemoved({ canvasId, elementIds: [elementId] }));
        } else if (snapshot !== undefined) {
          dispatch(elementSynced({ canvasId, element: snapshot }));
        }

        rollbackRef.current.delete(elementId);
      }

      if (result.code === SOCKET_ERROR_CODE.FORBIDDEN) {
        // Flip the UI to read-only right away, then explain. The server has
        // already refused, so the local role is what's stale.
        dispatch(projectAccessibilitySet({ projectId, accessibility: "viewer" }));
        dispatch(selectionChanged({ canvasId, elementIds: [] }));
        utils.toast.error("Your access changed to view-only. That change was not saved.");
        return;
      }

      if (result.code === SOCKET_ERROR_CODE.VERSION_CONFLICT) {
        // The server is sending the authoritative element separately. A silent
        // correction is the right outcome for a benign last-write-wins loss.
        return;
      }

      utils.toast.error(result.error);
    },
    [dispatch, projectId, canvasId],
  );

  const onSettled = useCallback(
    (elementId: string | null, result: TAck<unknown>) => {
      if (result.ok) {
        dispatch(pendingDecremented({ canvasId }));

        if (elementId !== null) {
          rollbackRef.current.delete(elementId);
        }

        return;
      }

      handleFailure(elementId, result);
    },
    [dispatch, canvasId, handleFailure],
  );

  const addElement = useCallback(
    (input: TElementCreateInput) => {
      if (!canEditRef.current) {
        utils.toast.error("You have view-only access.");
        return;
      }

      const optimistic: TCanvasElement = {
        elementId: input.elementId,
        canvasId,
        type: input.type,
        x: input.x,
        y: input.y,
        width: input.width,
        height: input.height,
        rotation: input.rotation ?? 0,
        opacity: input.opacity ?? 1,
        fill: input.fill ?? null,
        stroke: input.stroke ?? null,
        strokeWidth: input.strokeWidth ?? 0,
        cornerRadius: input.cornerRadius ?? 0,
        // Server assigns the real stacking index; a large value keeps it on top
        // until the ack arrives.
        zIndex: Number.MAX_SAFE_INTEGER,
        props: input.props ?? {},
        version: 1,
        createdBy: null,
      };

      // `null` marks "did not exist" so a rejection removes it rather than
      // restoring a phantom.
      rollbackRef.current.set(input.elementId, null);

      dispatch(elementUpserted({ canvasId, element: optimistic }));
      dispatch(selectionChanged({ canvasId, elementIds: [input.elementId] }));
      dispatch(pendingIncremented({ canvasId }));

      socketService.emit(SOCKET_EVENT.CLIENT.ELEMENT_CREATE, { projectId, canvasId, element: input }, (result) => {
        if (result.ok) {
          // Adopt the server's row: it carries the authoritative canvasId and
          // zIndex.
          dispatch(elementUpserted({ canvasId, element: result.data.element }));
        }

        onSettled(input.elementId, result);
      });
    },
    [dispatch, projectId, canvasId, onSettled],
  );

  const sendUpdate = useCallback(
    (elementId: string, patch: TElementPatch, isPending: boolean) => {
      const current = selectElement(store.getState(), canvasId, elementId);

      if (!current) {
        return;
      }

      if (!rollbackRef.current.has(elementId)) {
        rollbackRef.current.set(elementId, current);
      }

      const baseVersion = current.version;

      dispatch(elementPatched({ canvasId, elementId, patch, version: baseVersion + 1 }));

      if (isPending) {
        dispatch(pendingIncremented({ canvasId }));
      }

      socketService.emit(
        SOCKET_EVENT.CLIENT.ELEMENT_UPDATE,
        { projectId, canvasId, elementId, baseVersion, patch },
        (result) => {
          if (isPending) {
            onSettled(elementId, result);
            return;
          }

          // Preview frames don't hold a pending slot, but a FORBIDDEN mid-drag
          // still has to flip the UI to read-only.
          if (!result.ok && result.code === SOCKET_ERROR_CODE.FORBIDDEN) {
            dispatch(projectAccessibilitySet({ projectId, accessibility: "viewer" }));
          }
        },
      );
    },
    [dispatch, projectId, canvasId, store, onSettled],
  );

  /**
   * Rate floor for in-gesture updates: a 165Hz display would otherwise emit 165
   * messages a second per dragging user.
   *
   * Hand-rolled here rather than wrapping the shared `createThrottle`, because
   * building the throttle in a `useMemo` means constructing it during render
   * around a callback that touches refs. Keeping the timing state in refs that
   * are only ever touched inside the handler avoids that entirely.
   */
  const lastPreviewAtRef = useRef(0);
  const pendingPreviewRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancelPendingPreview = useCallback(() => {
    if (pendingPreviewRef.current !== null) {
      clearTimeout(pendingPreviewRef.current);
      pendingPreviewRef.current = null;
    }
  }, []);

  // Never leave a timer running past unmount — it would fire against a dead
  // store subscription.
  useEffect(() => cancelPendingPreview, [cancelPendingPreview]);

  const previewElement = useCallback(
    (elementId: string, patch: TElementPatch) => {
      if (!canEditRef.current) {
        return;
      }

      const elapsed = Date.now() - lastPreviewAtRef.current;

      if (elapsed >= TRANSFORM_EMIT_INTERVAL_MS) {
        cancelPendingPreview();
        lastPreviewAtRef.current = Date.now();
        sendUpdate(elementId, patch, false);
        return;
      }

      // Trailing edge, so the last frame of a fast gesture isn't dropped.
      cancelPendingPreview();
      pendingPreviewRef.current = setTimeout(() => {
        pendingPreviewRef.current = null;
        lastPreviewAtRef.current = Date.now();
        sendUpdate(elementId, patch, false);
      }, TRANSFORM_EMIT_INTERVAL_MS - elapsed);
    },
    [sendUpdate, cancelPendingPreview],
  );

  const commitElement = useCallback(
    (elementId: string, patch: TElementPatch) => {
      if (!canEditRef.current) {
        return;
      }

      // Cancel first: a queued trailing preview would otherwise land *after*
      // this final geometry and every observer would see the element jump back.
      cancelPendingPreview();
      sendUpdate(elementId, patch, true);
    },
    [sendUpdate, cancelPendingPreview],
  );

  const removeElements = useCallback(
    (elementIds: string[]) => {
      if (!canEditRef.current || elementIds.length === 0) {
        return;
      }

      const state = store.getState();
      const snapshots = elementIds
        .map((elementId) => selectElement(state, canvasId, elementId))
        .filter((element): element is TCanvasElement => element !== null);

      dispatch(elementsRemoved({ canvasId, elementIds }));
      dispatch(pendingIncremented({ canvasId }));

      socketService.emit(SOCKET_EVENT.CLIENT.ELEMENT_DELETE, { projectId, canvasId, elementIds }, (result) => {
        if (result.ok) {
          dispatch(pendingDecremented({ canvasId }));
          return;
        }

        // Restore everything that was optimistically removed.
        snapshots.forEach((element) => dispatch(elementSynced({ canvasId, element })));
        handleFailure(null, result);
      });
    },
    [dispatch, projectId, canvasId, store, handleFailure],
  );

  const reorderElements = useCallback(
    (order: TElementOrderEntry[]) => {
      if (!canEditRef.current || order.length === 0) {
        return;
      }

      dispatch(elementsReordered({ canvasId, order }));
      dispatch(pendingIncremented({ canvasId }));

      socketService.emit(SOCKET_EVENT.CLIENT.ELEMENT_REORDER, { projectId, canvasId, order }, (result) => {
        onSettled(null, result);
      });
    },
    [dispatch, projectId, canvasId, onSettled],
  );

  const setSelection = useCallback(
    (elementIds: string[]) => {
      dispatch(selectionChanged({ canvasId, elementIds }));
      // Viewers broadcast selection too — it's not a mutation, and seeing what
      // a reviewer is looking at is useful.
      socketService.emit(SOCKET_EVENT.CLIENT.SELECTION_CHANGE, { projectId, elementIds });
    },
    [dispatch, projectId, canvasId],
  );

  return { addElement, previewElement, commitElement, removeElements, reorderElements, setSelection };
};

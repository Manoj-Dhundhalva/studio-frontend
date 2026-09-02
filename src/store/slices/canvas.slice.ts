import { createAsyncThunk, createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { canvasService } from "@/services/canvas";
import { SYNC_STATUS, type TSyncStatus } from "@/services/canvas/canvas.constants";
import type { TCanvas, TCanvasElement, TElementOrderEntry, TElementPatch } from "@/services/canvas/canvas.types";
import type { RootState } from "../store";
import { REQUEST_STATUS, type TRequestStatus } from "./request-status";

export { REQUEST_STATUS, type TRequestStatus };

/** One slide's live editing state. Entities are keyed by `canvasId`, not `projectId` — a project can hold many. */
type TCanvasEntity = {
  canvas: TCanvas | null;
  byId: Record<string, TCanvasElement>;
  /** Element ids in paint order. */
  order: string[];
  selectedIds: string[];
  status: TRequestStatus;
  error: string | null;
  syncStatus: TSyncStatus;
  /** Outstanding optimistic mutations, drives the save indicator. */
  pendingCount: number;
  /**
   * Bumped whenever an element is added or removed. `SelectionTransformer` reads
   * it to re-attach: a freshly added element's Konva node isn't in the registry
   * until the render *after* `selectedIds` changes, so selection alone is not a
   * sufficient trigger.
   */
  revision: number;
};

type TCanvasState = {
  /** Keyed by canvasId. */
  entities: Record<string, TCanvasEntity>;
};

const initialState: TCanvasState = {
  entities: {},
};

const createEntity = (): TCanvasEntity => ({
  canvas: null,
  byId: {},
  order: [],
  selectedIds: [],
  status: REQUEST_STATUS.IDLE,
  error: null,
  syncStatus: SYNC_STATUS.SYNCED,
  pendingCount: 0,
  revision: 0,
});

const getEntity = (state: TCanvasState, canvasId: string): TCanvasEntity => state.entities[canvasId] ?? createEntity();

/** Keeps `order` sorted by zIndex, then by id so the sort is stable across peers. */
const sortOrder = (entity: TCanvasEntity): void => {
  entity.order.sort((left, right) => {
    const a = entity.byId[left];
    const b = entity.byId[right];

    if (!a || !b) {
      return 0;
    }

    return a.zIndex === b.zIndex ? left.localeCompare(right) : a.zIndex - b.zIndex;
  });
};

/** Lazy per-slide fetch — the fallback for a slide whose elements weren't in the join ack. */
export const fetchSlideElements = createAsyncThunk(
  "canvas/fetchSlideElements",
  async ({ projectId, canvasId }: { projectId: string; canvasId: string }) => {
    const state = await canvasService.getSlide(projectId, canvasId);
    return { canvasId, ...state };
  },
);

const canvasSlice = createSlice({
  name: "canvas",
  initialState,
  reducers: {
    /** Full authoritative state, from the join ack, `slide:activate`, or a reconnect. */
    canvasHydrated: (
      state,
      action: PayloadAction<{ canvasId: string; canvas: TCanvas; elements: TCanvasElement[] }>,
    ) => {
      const { canvasId, canvas, elements } = action.payload;
      const entity = getEntity(state, canvasId);

      entity.canvas = canvas;
      entity.byId = Object.fromEntries(elements.map((element) => [element.elementId, element]));
      entity.order = elements.map((element) => element.elementId);
      entity.status = REQUEST_STATUS.SUCCEEDED;
      entity.error = null;
      // Anything still selected but no longer present must be dropped.
      entity.selectedIds = entity.selectedIds.filter((id) => entity.byId[id] !== undefined);
      entity.revision += 1;
      sortOrder(entity);

      state.entities[canvasId] = entity;
    },

    elementUpserted: (state, action: PayloadAction<{ canvasId: string; element: TCanvasElement }>) => {
      const { canvasId, element } = action.payload;
      const entity = getEntity(state, canvasId);
      const isNew = entity.byId[element.elementId] === undefined;

      entity.byId[element.elementId] = element;

      if (isNew) {
        entity.order.push(element.elementId);
        entity.revision += 1;
      }

      sortOrder(entity);
      state.entities[canvasId] = entity;
    },

    elementPatched: (
      state,
      action: PayloadAction<{ canvasId: string; elementId: string; patch: TElementPatch; version: number }>,
    ) => {
      const { canvasId, elementId, patch, version } = action.payload;
      const entity = getEntity(state, canvasId);
      const existing = entity.byId[elementId];

      if (!existing) {
        return;
      }

      // Field by field rather than a spread: under `exactOptionalPropertyTypes`
      // spreading a patch writes `undefined` over fields the sender never
      // mentioned, blanking them.
      if (patch.x !== undefined) existing.x = patch.x;
      if (patch.y !== undefined) existing.y = patch.y;
      if (patch.width !== undefined) existing.width = patch.width;
      if (patch.height !== undefined) existing.height = patch.height;
      if (patch.rotation !== undefined) existing.rotation = patch.rotation;
      if (patch.opacity !== undefined) existing.opacity = patch.opacity;
      if (patch.fill !== undefined) existing.fill = patch.fill;
      if (patch.stroke !== undefined) existing.stroke = patch.stroke;
      if (patch.strokeWidth !== undefined) existing.strokeWidth = patch.strokeWidth;
      if (patch.cornerRadius !== undefined) existing.cornerRadius = patch.cornerRadius;
      if (patch.props !== undefined) existing.props = patch.props;

      existing.version = version;
      state.entities[canvasId] = entity;
    },

    /** Authoritative element after losing a version race — overwrites unconditionally. */
    elementSynced: (state, action: PayloadAction<{ canvasId: string; element: TCanvasElement }>) => {
      const { canvasId, element } = action.payload;
      const entity = getEntity(state, canvasId);

      entity.byId[element.elementId] = element;

      if (!entity.order.includes(element.elementId)) {
        entity.order.push(element.elementId);
        entity.revision += 1;
      }

      sortOrder(entity);
      state.entities[canvasId] = entity;
    },

    elementsRemoved: (state, action: PayloadAction<{ canvasId: string; elementIds: string[] }>) => {
      const { canvasId, elementIds } = action.payload;
      const entity = getEntity(state, canvasId);
      const removed = new Set(elementIds);

      elementIds.forEach((elementId) => {
        delete entity.byId[elementId];
      });

      entity.order = entity.order.filter((elementId) => !removed.has(elementId));
      entity.selectedIds = entity.selectedIds.filter((elementId) => !removed.has(elementId));
      entity.revision += 1;

      state.entities[canvasId] = entity;
    },

    elementsReordered: (state, action: PayloadAction<{ canvasId: string; order: TElementOrderEntry[] }>) => {
      const { canvasId, order } = action.payload;
      const entity = getEntity(state, canvasId);

      order.forEach(({ elementId, zIndex }) => {
        const element = entity.byId[elementId];

        if (element) {
          element.zIndex = zIndex;
        }
      });

      sortOrder(entity);
      state.entities[canvasId] = entity;
    },

    canvasReplaced: (state, action: PayloadAction<{ canvasId: string; canvas: TCanvas }>) => {
      const { canvasId, canvas } = action.payload;
      const entity = getEntity(state, canvasId);

      entity.canvas = canvas;
      state.entities[canvasId] = entity;
    },

    selectionChanged: (state, action: PayloadAction<{ canvasId: string; elementIds: string[] }>) => {
      const { canvasId, elementIds } = action.payload;
      const entity = getEntity(state, canvasId);

      entity.selectedIds = elementIds;
      state.entities[canvasId] = entity;
    },

    syncStatusChanged: (state, action: PayloadAction<{ canvasId: string; syncStatus: TSyncStatus }>) => {
      const { canvasId, syncStatus } = action.payload;
      const entity = getEntity(state, canvasId);

      entity.syncStatus = syncStatus;
      state.entities[canvasId] = entity;
    },

    pendingIncremented: (state, action: PayloadAction<{ canvasId: string }>) => {
      const entity = getEntity(state, action.payload.canvasId);

      entity.pendingCount += 1;
      state.entities[action.payload.canvasId] = entity;
    },

    pendingDecremented: (state, action: PayloadAction<{ canvasId: string }>) => {
      const entity = getEntity(state, action.payload.canvasId);

      entity.pendingCount = Math.max(0, entity.pendingCount - 1);
      state.entities[action.payload.canvasId] = entity;
    },

    canvasReset: (state, action: PayloadAction<string>) => {
      delete state.entities[action.payload];
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchSlideElements.pending, (state, action) => {
        const entity = getEntity(state, action.meta.arg.canvasId);
        entity.status = REQUEST_STATUS.LOADING;
        entity.error = null;
        state.entities[action.meta.arg.canvasId] = entity;
      })
      .addCase(fetchSlideElements.fulfilled, (state, action) => {
        const { canvasId, canvas, elements } = action.payload;
        const entity = getEntity(state, canvasId);

        entity.canvas = canvas;
        entity.byId = Object.fromEntries(elements.map((element) => [element.elementId, element]));
        entity.order = elements.map((element) => element.elementId);
        entity.status = REQUEST_STATUS.SUCCEEDED;
        entity.error = null;
        entity.revision += 1;
        sortOrder(entity);

        state.entities[canvasId] = entity;
      })
      .addCase(fetchSlideElements.rejected, (state, action) => {
        const entity = getEntity(state, action.meta.arg.canvasId);
        entity.status = REQUEST_STATUS.FAILED;
        entity.error = action.error.message ?? "Failed to load slide";
        state.entities[action.meta.arg.canvasId] = entity;
      });
  },
});

export const {
  canvasHydrated,
  elementUpserted,
  elementPatched,
  elementSynced,
  elementsRemoved,
  elementsReordered,
  canvasReplaced,
  selectionChanged,
  syncStatusChanged,
  pendingIncremented,
  pendingDecremented,
  canvasReset,
} = canvasSlice.actions;

/**
 * Module-level frozen fallbacks. A selector returning `?? []` would hand back a
 * fresh array identity on every call, which makes `useAppSelector` re-render
 * forever. The existing slices dodge this by returning `null`; array-returning
 * selectors cannot.
 */
const EMPTY_IDS: readonly string[] = Object.freeze([]);

export const selectCanvas = (state: RootState, canvasId: string): TCanvas | null =>
  state.canvas.entities[canvasId]?.canvas ?? null;

export const selectCanvasStatus = (state: RootState, canvasId: string): TRequestStatus =>
  state.canvas.entities[canvasId]?.status ?? REQUEST_STATUS.IDLE;

export const selectCanvasError = (state: RootState, canvasId: string): string | null =>
  state.canvas.entities[canvasId]?.error ?? null;

export const selectElementOrder = (state: RootState, canvasId: string): readonly string[] =>
  state.canvas.entities[canvasId]?.order ?? EMPTY_IDS;

export const selectElement = (state: RootState, canvasId: string, elementId: string): TCanvasElement | null =>
  state.canvas.entities[canvasId]?.byId[elementId] ?? null;

export const selectSelectedIds = (state: RootState, canvasId: string): readonly string[] =>
  state.canvas.entities[canvasId]?.selectedIds ?? EMPTY_IDS;

export const selectSyncStatus = (state: RootState, canvasId: string): TSyncStatus =>
  state.canvas.entities[canvasId]?.syncStatus ?? SYNC_STATUS.SYNCED;

export const selectPendingCount = (state: RootState, canvasId: string): number =>
  state.canvas.entities[canvasId]?.pendingCount ?? 0;

export const selectCanvasRevision = (state: RootState, canvasId: string): number =>
  state.canvas.entities[canvasId]?.revision ?? 0;

export const selectHasSlideEntity = (state: RootState, canvasId: string): boolean =>
  state.canvas.entities[canvasId] !== undefined;

export default canvasSlice.reducer;

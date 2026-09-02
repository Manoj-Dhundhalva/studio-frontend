import { createAsyncThunk, createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { canvasService } from "@/services/canvas";
import { SYNC_STATUS, type TSyncStatus } from "@/services/canvas/canvas.constants";
import type { TCanvas, TCanvasElement, TElementOrderEntry, TElementPatch } from "@/services/canvas/canvas.types";
import type { RootState } from "../store";
import { REQUEST_STATUS, type TRequestStatus } from "./request-status";

export { REQUEST_STATUS, type TRequestStatus };

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

const getEntity = (state: TCanvasState, projectId: string): TCanvasEntity =>
  state.entities[projectId] ?? createEntity();

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

export const fetchCanvas = createAsyncThunk("canvas/fetchCanvas", async (projectId: string) => {
  const state = await canvasService.getCanvas(projectId);
  return { projectId, ...state };
});

const canvasSlice = createSlice({
  name: "canvas",
  initialState,
  reducers: {
    /** Full authoritative state, from the join ack or a reconnect. */
    canvasHydrated: (
      state,
      action: PayloadAction<{ projectId: string; canvas: TCanvas; elements: TCanvasElement[] }>,
    ) => {
      const { projectId, canvas, elements } = action.payload;
      const entity = getEntity(state, projectId);

      entity.canvas = canvas;
      entity.byId = Object.fromEntries(elements.map((element) => [element.elementId, element]));
      entity.order = elements.map((element) => element.elementId);
      entity.status = REQUEST_STATUS.SUCCEEDED;
      entity.error = null;
      // Anything still selected but no longer present must be dropped.
      entity.selectedIds = entity.selectedIds.filter((id) => entity.byId[id] !== undefined);
      entity.revision += 1;
      sortOrder(entity);

      state.entities[projectId] = entity;
    },

    elementUpserted: (state, action: PayloadAction<{ projectId: string; element: TCanvasElement }>) => {
      const { projectId, element } = action.payload;
      const entity = getEntity(state, projectId);
      const isNew = entity.byId[element.elementId] === undefined;

      entity.byId[element.elementId] = element;

      if (isNew) {
        entity.order.push(element.elementId);
        entity.revision += 1;
      }

      sortOrder(entity);
      state.entities[projectId] = entity;
    },

    elementPatched: (
      state,
      action: PayloadAction<{ projectId: string; elementId: string; patch: TElementPatch; version: number }>,
    ) => {
      const { projectId, elementId, patch, version } = action.payload;
      const entity = getEntity(state, projectId);
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
      state.entities[projectId] = entity;
    },

    /** Authoritative element after losing a version race — overwrites unconditionally. */
    elementSynced: (state, action: PayloadAction<{ projectId: string; element: TCanvasElement }>) => {
      const { projectId, element } = action.payload;
      const entity = getEntity(state, projectId);

      entity.byId[element.elementId] = element;

      if (!entity.order.includes(element.elementId)) {
        entity.order.push(element.elementId);
        entity.revision += 1;
      }

      sortOrder(entity);
      state.entities[projectId] = entity;
    },

    elementsRemoved: (state, action: PayloadAction<{ projectId: string; elementIds: string[] }>) => {
      const { projectId, elementIds } = action.payload;
      const entity = getEntity(state, projectId);
      const removed = new Set(elementIds);

      elementIds.forEach((elementId) => {
        delete entity.byId[elementId];
      });

      entity.order = entity.order.filter((elementId) => !removed.has(elementId));
      entity.selectedIds = entity.selectedIds.filter((elementId) => !removed.has(elementId));
      entity.revision += 1;

      state.entities[projectId] = entity;
    },

    elementsReordered: (state, action: PayloadAction<{ projectId: string; order: TElementOrderEntry[] }>) => {
      const { projectId, order } = action.payload;
      const entity = getEntity(state, projectId);

      order.forEach(({ elementId, zIndex }) => {
        const element = entity.byId[elementId];

        if (element) {
          element.zIndex = zIndex;
        }
      });

      sortOrder(entity);
      state.entities[projectId] = entity;
    },

    canvasReplaced: (state, action: PayloadAction<{ projectId: string; canvas: TCanvas }>) => {
      const { projectId, canvas } = action.payload;
      const entity = getEntity(state, projectId);

      entity.canvas = canvas;
      state.entities[projectId] = entity;
    },

    selectionChanged: (state, action: PayloadAction<{ projectId: string; elementIds: string[] }>) => {
      const { projectId, elementIds } = action.payload;
      const entity = getEntity(state, projectId);

      entity.selectedIds = elementIds;
      state.entities[projectId] = entity;
    },

    syncStatusChanged: (state, action: PayloadAction<{ projectId: string; syncStatus: TSyncStatus }>) => {
      const { projectId, syncStatus } = action.payload;
      const entity = getEntity(state, projectId);

      entity.syncStatus = syncStatus;
      state.entities[projectId] = entity;
    },

    pendingIncremented: (state, action: PayloadAction<{ projectId: string }>) => {
      const entity = getEntity(state, action.payload.projectId);

      entity.pendingCount += 1;
      state.entities[action.payload.projectId] = entity;
    },

    pendingDecremented: (state, action: PayloadAction<{ projectId: string }>) => {
      const entity = getEntity(state, action.payload.projectId);

      entity.pendingCount = Math.max(0, entity.pendingCount - 1);
      state.entities[action.payload.projectId] = entity;
    },

    canvasReset: (state, action: PayloadAction<string>) => {
      delete state.entities[action.payload];
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCanvas.pending, (state, action) => {
        const entity = getEntity(state, action.meta.arg);
        entity.status = REQUEST_STATUS.LOADING;
        entity.error = null;
        state.entities[action.meta.arg] = entity;
      })
      .addCase(fetchCanvas.fulfilled, (state, action) => {
        const { projectId, canvas, elements } = action.payload;
        const entity = getEntity(state, projectId);

        entity.canvas = canvas;
        entity.byId = Object.fromEntries(elements.map((element) => [element.elementId, element]));
        entity.order = elements.map((element) => element.elementId);
        entity.status = REQUEST_STATUS.SUCCEEDED;
        entity.error = null;
        entity.revision += 1;
        sortOrder(entity);

        state.entities[projectId] = entity;
      })
      .addCase(fetchCanvas.rejected, (state, action) => {
        const entity = getEntity(state, action.meta.arg);
        entity.status = REQUEST_STATUS.FAILED;
        entity.error = action.error.message ?? "Failed to load canvas";
        state.entities[action.meta.arg] = entity;
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

export const selectCanvas = (state: RootState, projectId: string): TCanvas | null =>
  state.canvas.entities[projectId]?.canvas ?? null;

export const selectCanvasStatus = (state: RootState, projectId: string): TRequestStatus =>
  state.canvas.entities[projectId]?.status ?? REQUEST_STATUS.IDLE;

export const selectCanvasError = (state: RootState, projectId: string): string | null =>
  state.canvas.entities[projectId]?.error ?? null;

export const selectElementOrder = (state: RootState, projectId: string): readonly string[] =>
  state.canvas.entities[projectId]?.order ?? EMPTY_IDS;

export const selectElement = (state: RootState, projectId: string, elementId: string): TCanvasElement | null =>
  state.canvas.entities[projectId]?.byId[elementId] ?? null;

export const selectSelectedIds = (state: RootState, projectId: string): readonly string[] =>
  state.canvas.entities[projectId]?.selectedIds ?? EMPTY_IDS;

export const selectSyncStatus = (state: RootState, projectId: string): TSyncStatus =>
  state.canvas.entities[projectId]?.syncStatus ?? SYNC_STATUS.SYNCED;

export const selectPendingCount = (state: RootState, projectId: string): number =>
  state.canvas.entities[projectId]?.pendingCount ?? 0;

export const selectCanvasRevision = (state: RootState, projectId: string): number =>
  state.canvas.entities[projectId]?.revision ?? 0;

export default canvasSlice.reducer;

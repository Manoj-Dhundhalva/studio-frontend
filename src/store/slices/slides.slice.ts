import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { TCanvas, TSlideOrderEntry } from "@/services/canvas/canvas.types";
import type { RootState } from "../store";
import { REQUEST_STATUS, type TRequestStatus } from "./request-status";

/**
 * The project-level "which slides exist, in what order, which one is active"
 * concern — deliberately separate from `canvas.slice.ts`, which holds one
 * slide's live editing state (elements, selection, sync). This slice hydrates
 * once per join and updates on `slide:*` events; it never touches per-element
 * data.
 */
type TSlidesEntity = {
  /** Ordered by `orderIndex`. */
  slides: TCanvas[];
  activeCanvasId: string | null;
  status: TRequestStatus;
  error: string | null;
};

type TSlidesState = {
  /** Keyed by projectId. */
  entities: Record<string, TSlidesEntity>;
};

const initialState: TSlidesState = {
  entities: {},
};

const createEntity = (): TSlidesEntity => ({
  slides: [],
  activeCanvasId: null,
  status: REQUEST_STATUS.IDLE,
  error: null,
});

const getEntity = (state: TSlidesState, projectId: string): TSlidesEntity =>
  state.entities[projectId] ?? createEntity();

const sortSlides = (slides: TCanvas[]): TCanvas[] =>
  [...slides].sort((left, right) => left.orderIndex - right.orderIndex);

const slidesSlice = createSlice({
  name: "slides",
  initialState,
  reducers: {
    /** Full authoritative slide list, from the join ack. */
    slidesHydrated: (
      state,
      action: PayloadAction<{ projectId: string; slides: TCanvas[]; activeCanvasId: string }>,
    ) => {
      const { projectId, slides, activeCanvasId } = action.payload;
      const entity = getEntity(state, projectId);

      entity.slides = sortSlides(slides);
      entity.activeCanvasId = activeCanvasId;
      entity.status = REQUEST_STATUS.SUCCEEDED;
      entity.error = null;

      state.entities[projectId] = entity;
    },

    /** Adds a new slide, or replaces an existing one with the server's authoritative version. */
    slideUpserted: (state, action: PayloadAction<{ projectId: string; slide: TCanvas }>) => {
      const { projectId, slide } = action.payload;
      const entity = getEntity(state, projectId);
      const exists = entity.slides.some((existing) => existing.canvasId === slide.canvasId);

      entity.slides = sortSlides(
        exists
          ? entity.slides.map((existing) => (existing.canvasId === slide.canvasId ? slide : existing))
          : [...entity.slides, slide],
      );

      state.entities[projectId] = entity;
    },

    slideRemoved: (state, action: PayloadAction<{ projectId: string; canvasId: string }>) => {
      const { projectId, canvasId } = action.payload;
      const entity = getEntity(state, projectId);

      entity.slides = entity.slides.filter((slide) => slide.canvasId !== canvasId);

      if (entity.activeCanvasId === canvasId) {
        entity.activeCanvasId = entity.slides[0]?.canvasId ?? null;
      }

      state.entities[projectId] = entity;
    },

    slidesReordered: (state, action: PayloadAction<{ projectId: string; order: TSlideOrderEntry[] }>) => {
      const { projectId, order } = action.payload;
      const entity = getEntity(state, projectId);
      const orderIndexById = new Map(order.map(({ canvasId, orderIndex }) => [canvasId, orderIndex]));

      entity.slides = sortSlides(
        entity.slides.map((slide) => {
          const orderIndex = orderIndexById.get(slide.canvasId);
          return orderIndex === undefined ? slide : { ...slide, orderIndex };
        }),
      );

      state.entities[projectId] = entity;
    },

    activeSlideChanged: (state, action: PayloadAction<{ projectId: string; canvasId: string }>) => {
      const { projectId, canvasId } = action.payload;
      const entity = getEntity(state, projectId);

      entity.activeCanvasId = canvasId;
      state.entities[projectId] = entity;
    },

    slidesReset: (state, action: PayloadAction<string>) => {
      delete state.entities[action.payload];
    },
  },
});

export const { slidesHydrated, slideUpserted, slideRemoved, slidesReordered, activeSlideChanged, slidesReset } =
  slidesSlice.actions;

const EMPTY_SLIDES: readonly TCanvas[] = Object.freeze([]);

export const selectSlides = (state: RootState, projectId: string): readonly TCanvas[] =>
  state.slides.entities[projectId]?.slides ?? EMPTY_SLIDES;

export const selectActiveCanvasId = (state: RootState, projectId: string): string | null =>
  state.slides.entities[projectId]?.activeCanvasId ?? null;

export const selectSlidesStatus = (state: RootState, projectId: string): TRequestStatus =>
  state.slides.entities[projectId]?.status ?? REQUEST_STATUS.IDLE;

export default slidesSlice.reducer;

import { createAsyncThunk, createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { mediaService } from "@/services/media/media.service";
import type { TProjectMedia } from "@/services/media/media.types";
import type { RootState } from "../store";
import { REQUEST_STATUS, type TRequestStatus } from "./request-status";

export { REQUEST_STATUS, type TRequestStatus };

/**
 * The Uploads panel's project-wide media library — every member's uploads,
 * not scoped to a slide. Fetched once per project and kept live by
 * `media:uploaded`/`media:deleted` broadcasts.
 */
type TMediaEntity = {
  /** Newest first, matching the REST list order. */
  items: TProjectMedia[];
  status: TRequestStatus;
  error: string | null;
};

type TMediaState = {
  entities: Record<string, TMediaEntity>;
};

const initialState: TMediaState = {
  entities: {},
};

const createEntity = (): TMediaEntity => ({
  items: [],
  status: REQUEST_STATUS.IDLE,
  error: null,
});

const getEntity = (state: TMediaState, projectId: string): TMediaEntity => state.entities[projectId] ?? createEntity();

export const fetchMedia = createAsyncThunk("media/fetchMedia", async (projectId: string) => {
  const items = await mediaService.listMedia(projectId);
  return { projectId, items };
});

const mediaSlice = createSlice({
  name: "media",
  initialState,
  reducers: {
    /** Adds a new upload, or replaces an existing row — idempotent, so applying
     * both the REST response and its own broadcast echo is harmless. */
    mediaAdded: (state, action: PayloadAction<{ projectId: string; media: TProjectMedia }>) => {
      const { projectId, media } = action.payload;
      const entity = getEntity(state, projectId);
      const exists = entity.items.some((item) => item.mediaId === media.mediaId);

      entity.items = exists
        ? entity.items.map((item) => (item.mediaId === media.mediaId ? media : item))
        : [media, ...entity.items];

      state.entities[projectId] = entity;
    },

    mediaRemoved: (state, action: PayloadAction<{ projectId: string; mediaId: string }>) => {
      const { projectId, mediaId } = action.payload;
      const entity = getEntity(state, projectId);

      entity.items = entity.items.filter((item) => item.mediaId !== mediaId);
      state.entities[projectId] = entity;
    },

    mediaReset: (state, action: PayloadAction<string>) => {
      delete state.entities[action.payload];
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchMedia.pending, (state, action) => {
        const entity = getEntity(state, action.meta.arg);
        entity.status = REQUEST_STATUS.LOADING;
        entity.error = null;
        state.entities[action.meta.arg] = entity;
      })
      .addCase(fetchMedia.fulfilled, (state, action) => {
        state.entities[action.payload.projectId] = {
          items: action.payload.items,
          status: REQUEST_STATUS.SUCCEEDED,
          error: null,
        };
      })
      .addCase(fetchMedia.rejected, (state, action) => {
        const entity = getEntity(state, action.meta.arg);
        entity.status = REQUEST_STATUS.FAILED;
        entity.error = action.error.message ?? "Failed to load uploads";
        state.entities[action.meta.arg] = entity;
      });
  },
});

export const { mediaAdded, mediaRemoved, mediaReset } = mediaSlice.actions;

const EMPTY_MEDIA: readonly TProjectMedia[] = Object.freeze([]);

export const selectMedia = (state: RootState, projectId: string): readonly TProjectMedia[] =>
  state.media.entities[projectId]?.items ?? EMPTY_MEDIA;

export const selectMediaStatus = (state: RootState, projectId: string): TRequestStatus =>
  state.media.entities[projectId]?.status ?? REQUEST_STATUS.IDLE;

export default mediaSlice.reducer;

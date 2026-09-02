import { createAsyncThunk, createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { aiService } from "@/services/ai/ai.service";
import type { TAiMessage } from "@/services/ai/ai.types";
import type { RootState } from "../store";
import { REQUEST_STATUS, type TRequestStatus } from "./request-status";

export { REQUEST_STATUS, type TRequestStatus };

/**
 * The AI panel's project-wide chat history. Fetched once per project and kept
 * live by `ai:messageCreated` broadcasts. `isSending` drives the panel's
 * waiting-for-reply state around one in-flight `sendMessage` call.
 */
type TAiEntity = {
  /** Oldest first, matching the REST list order (chat display order). */
  messages: TAiMessage[];
  status: TRequestStatus;
  isSending: boolean;
  error: string | null;
};

type TAiState = {
  entities: Record<string, TAiEntity>;
};

const initialState: TAiState = {
  entities: {},
};

const createEntity = (): TAiEntity => ({
  messages: [],
  status: REQUEST_STATUS.IDLE,
  isSending: false,
  error: null,
});

const getEntity = (state: TAiState, projectId: string): TAiEntity => state.entities[projectId] ?? createEntity();

export const fetchAiMessages = createAsyncThunk("ai/fetchAiMessages", async (projectId: string) => {
  const messages = await aiService.listMessages(projectId);
  return { projectId, messages };
});

const aiSlice = createSlice({
  name: "ai",
  initialState,
  reducers: {
    /** Idempotent — dedupes by messageId, so a REST response and its own broadcast echo are both harmless. */
    aiMessageAdded: (state, action: PayloadAction<{ projectId: string; message: TAiMessage }>) => {
      const { projectId, message } = action.payload;
      const entity = getEntity(state, projectId);
      const exists = entity.messages.some((item) => item.messageId === message.messageId);

      entity.messages = exists
        ? entity.messages.map((item) => (item.messageId === message.messageId ? message : item))
        : [...entity.messages, message];

      state.entities[projectId] = entity;
    },

    aiSendStarted: (state, action: PayloadAction<string>) => {
      const entity = getEntity(state, action.payload);
      entity.isSending = true;
      state.entities[action.payload] = entity;
    },

    aiSendFinished: (state, action: PayloadAction<string>) => {
      const entity = getEntity(state, action.payload);
      entity.isSending = false;
      state.entities[action.payload] = entity;
    },

    aiReset: (state, action: PayloadAction<string>) => {
      delete state.entities[action.payload];
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchAiMessages.pending, (state, action) => {
        const entity = getEntity(state, action.meta.arg);
        entity.status = REQUEST_STATUS.LOADING;
        entity.error = null;
        state.entities[action.meta.arg] = entity;
      })
      .addCase(fetchAiMessages.fulfilled, (state, action) => {
        const entity = getEntity(state, action.payload.projectId);
        state.entities[action.payload.projectId] = {
          ...entity,
          messages: action.payload.messages,
          status: REQUEST_STATUS.SUCCEEDED,
          error: null,
        };
      })
      .addCase(fetchAiMessages.rejected, (state, action) => {
        const entity = getEntity(state, action.meta.arg);
        entity.status = REQUEST_STATUS.FAILED;
        entity.error = action.error.message ?? "Failed to load AI chat history";
        state.entities[action.meta.arg] = entity;
      });
  },
});

export const { aiMessageAdded, aiSendStarted, aiSendFinished, aiReset } = aiSlice.actions;

const EMPTY_MESSAGES: readonly TAiMessage[] = Object.freeze([]);

export const selectAiMessages = (state: RootState, projectId: string): readonly TAiMessage[] =>
  state.ai.entities[projectId]?.messages ?? EMPTY_MESSAGES;

export const selectAiStatus = (state: RootState, projectId: string): TRequestStatus =>
  state.ai.entities[projectId]?.status ?? REQUEST_STATUS.IDLE;

export const selectIsAiSending = (state: RootState, projectId: string): boolean =>
  state.ai.entities[projectId]?.isSending ?? false;

export default aiSlice.reducer;

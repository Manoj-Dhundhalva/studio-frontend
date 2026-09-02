import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { TProjectMemberRole } from "@/services/projects/projects.types";
import type { TPresenceMember } from "@/services/socket/socket.types";
import type { RootState } from "../store";

/**
 * Who is currently in the editor, and this client's own live role.
 *
 * This *is* in Redux — unlike cursor positions — because join/leave/role-change
 * events are a handful per session, and the navbar's presence bar sits in a
 * layout above the route, so it can only read this through the store.
 */
type TPresenceEntity = {
  /** Keyed by socketId: one entry per tab, so two tabs are two cursors. */
  bySocketId: Record<string, TPresenceMember>;
  socketOrder: string[];
  selfSocketId: string | null;
};

type TPresenceState = {
  entities: Record<string, TPresenceEntity>;
};

const initialState: TPresenceState = {
  entities: {},
};

const createEntity = (): TPresenceEntity => ({
  bySocketId: {},
  socketOrder: [],
  selfSocketId: null,
});

const getEntity = (state: TPresenceState, projectId: string): TPresenceEntity =>
  state.entities[projectId] ?? createEntity();

const presenceSlice = createSlice({
  name: "presence",
  initialState,
  reducers: {
    presenceSynced: (
      state,
      action: PayloadAction<{ projectId: string; members: TPresenceMember[]; selfSocketId?: string }>,
    ) => {
      const { projectId, members, selfSocketId } = action.payload;
      const entity = getEntity(state, projectId);

      entity.bySocketId = Object.fromEntries(members.map((member) => [member.socketId, member]));
      entity.socketOrder = members.map((member) => member.socketId);

      if (selfSocketId !== undefined) {
        entity.selfSocketId = selfSocketId;
      }

      state.entities[projectId] = entity;
    },

    presenceJoined: (state, action: PayloadAction<{ projectId: string; member: TPresenceMember }>) => {
      const { projectId, member } = action.payload;
      const entity = getEntity(state, projectId);

      if (entity.bySocketId[member.socketId] === undefined) {
        entity.socketOrder.push(member.socketId);
      }

      entity.bySocketId[member.socketId] = member;
      state.entities[projectId] = entity;
    },

    presenceLeft: (state, action: PayloadAction<{ projectId: string; socketId: string }>) => {
      const { projectId, socketId } = action.payload;
      const entity = getEntity(state, projectId);

      delete entity.bySocketId[socketId];
      entity.socketOrder = entity.socketOrder.filter((id) => id !== socketId);

      state.entities[projectId] = entity;
    },

    presenceRoleChanged: (
      state,
      action: PayloadAction<{ projectId: string; userId: string; accessibility: TProjectMemberRole }>,
    ) => {
      const { projectId, userId, accessibility } = action.payload;
      const entity = getEntity(state, projectId);

      // Every socket of that user, so all their tabs reflect the change.
      Object.values(entity.bySocketId).forEach((member) => {
        if (member.userId === userId) {
          member.accessibility = accessibility;
        }
      });

      state.entities[projectId] = entity;
    },

    presenceActiveSlideChanged: (
      state,
      action: PayloadAction<{ projectId: string; socketId: string; canvasId: string }>,
    ) => {
      const { projectId, socketId, canvasId } = action.payload;
      const entity = getEntity(state, projectId);
      const member = entity.bySocketId[socketId];

      if (member) {
        member.activeCanvasId = canvasId;
      }

      state.entities[projectId] = entity;
    },

    selfSocketIdSet: (state, action: PayloadAction<{ projectId: string; socketId: string }>) => {
      const entity = getEntity(state, action.payload.projectId);

      entity.selfSocketId = action.payload.socketId;
      state.entities[action.payload.projectId] = entity;
    },

    presenceReset: (state, action: PayloadAction<string>) => {
      delete state.entities[action.payload];
    },
  },
});

export const {
  presenceSynced,
  presenceJoined,
  presenceLeft,
  presenceRoleChanged,
  presenceActiveSlideChanged,
  selfSocketIdSet,
  presenceReset,
} = presenceSlice.actions;

const EMPTY_MEMBERS: readonly TPresenceMember[] = Object.freeze([]);

/**
 * Live members, deduplicated to one entry per person. Someone with three tabs
 * is one avatar in the navbar (but still three cursors on the canvas, which
 * read from `bySocketId` instead).
 */
export const selectPresenceMembers = (state: RootState, projectId: string): readonly TPresenceMember[] => {
  const entity = state.presence.entities[projectId];

  if (!entity) {
    return EMPTY_MEMBERS;
  }

  const seen = new Set<string>();
  const members: TPresenceMember[] = [];

  for (const socketId of entity.socketOrder) {
    const member = entity.bySocketId[socketId];

    if (member && !seen.has(member.userId)) {
      seen.add(member.userId);
      members.push(member);
    }
  }

  return members;
};

/** Every socket, for the cursor layer — one cursor per tab is correct. */
export const selectPresenceSockets = (state: RootState, projectId: string): readonly TPresenceMember[] => {
  const entity = state.presence.entities[projectId];

  if (!entity) {
    return EMPTY_MEMBERS;
  }

  return entity.socketOrder
    .map((socketId) => entity.bySocketId[socketId])
    .filter((member): member is TPresenceMember => member !== undefined);
};

export const selectSelfSocketId = (state: RootState, projectId: string): string | null =>
  state.presence.entities[projectId]?.selfSocketId ?? null;

export default presenceSlice.reducer;

import { createAsyncThunk, createSlice, isAnyOf } from "@reduxjs/toolkit";
import { projectsService } from "@/services/projects";
import type { TMemberAccessibilityInput, TProjectMember } from "@/services/projects/projects.types";
import type { RootState } from "../store";
import { REQUEST_STATUS, type TRequestStatus } from "./request-status";

export { REQUEST_STATUS, type TRequestStatus };

const MEMBERS_PAGE_SIZE = 50;

type TMembersEntity = {
  data: TProjectMember[] | null;
  total: number;
  status: TRequestStatus;
  error: string | null;
};

type TMembersState = {
  entities: Record<string, TMembersEntity>;
};

const initialState: TMembersState = {
  entities: {},
};

const getEntity = (state: TMembersState, projectId: string): TMembersEntity =>
  state.entities[projectId] ?? { data: null, total: 0, status: REQUEST_STATUS.IDLE, error: null };

export const fetchProjectMembers = createAsyncThunk("members/fetchProjectMembers", async (projectId: string) => {
  const result = await projectsService.getProjectMembers(projectId, { limit: MEMBERS_PAGE_SIZE, offset: 0 });
  return { projectId, ...result };
});

export const loadMoreProjectMembers = createAsyncThunk(
  "members/loadMoreProjectMembers",
  async (projectId: string, { getState }) => {
    const entity = getEntity((getState() as RootState).members, projectId);
    const result = await projectsService.getProjectMembers(projectId, {
      limit: MEMBERS_PAGE_SIZE,
      offset: entity.data?.length ?? 0,
    });
    return { projectId, ...result };
  },
  {
    condition: (projectId, { getState }) => {
      const state = getState() as RootState;
      const entity = state.members.entities[projectId];
      return !!entity && entity.data !== null && entity.data.length < entity.total;
    },
  },
);

/**
 * Re-fetches after a successful write, same "mutate then refetch" convention
 * as `updateProjectName`. Re-requests everything currently loaded (not just
 * the first page) so a mutation made after "Load more" doesn't drop pages
 * that were already loaded back down to just the first `MEMBERS_PAGE_SIZE`.
 */
const resyncProjectMembers = createAsyncThunk(
  "members/resyncProjectMembers",
  async (projectId: string, { getState }) => {
    const entity = getEntity((getState() as RootState).members, projectId);
    const limit = Math.max(entity.data?.length ?? 0, MEMBERS_PAGE_SIZE);
    const result = await projectsService.getProjectMembers(projectId, { limit, offset: 0 });
    return { projectId, ...result };
  },
);

export const addProjectMembers = createAsyncThunk(
  "members/addProjectMembers",
  async ({ projectId, members }: { projectId: string; members: TMemberAccessibilityInput[] }, { dispatch }) => {
    await projectsService.addProjectMembers(projectId, members);
    return dispatch(resyncProjectMembers(projectId)).unwrap();
  },
);

export const updateProjectMembersAccessibility = createAsyncThunk(
  "members/updateProjectMembersAccessibility",
  async ({ projectId, members }: { projectId: string; members: TMemberAccessibilityInput[] }, { dispatch }) => {
    await projectsService.updateProjectMembersAccessibility(projectId, members);
    return dispatch(resyncProjectMembers(projectId)).unwrap();
  },
);

export const removeProjectMembers = createAsyncThunk(
  "members/removeProjectMembers",
  async ({ projectId, userIds }: { projectId: string; userIds: string[] }, { dispatch }) => {
    await projectsService.removeProjectMembers(projectId, userIds);
    return dispatch(resyncProjectMembers(projectId)).unwrap();
  },
);

const membersSlice = createSlice({
  name: "members",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(loadMoreProjectMembers.fulfilled, (state, action) => {
        const { projectId, members, total } = action.payload;
        const entity = getEntity(state, projectId);
        state.entities[projectId] = {
          data: [...(entity.data ?? []), ...members],
          total,
          status: REQUEST_STATUS.SUCCEEDED,
          error: null,
        };
      })
      .addCase(loadMoreProjectMembers.rejected, (state, action) => {
        const entity = getEntity(state, action.meta.arg);
        entity.status = REQUEST_STATUS.FAILED;
        entity.error = action.error.message ?? "Failed to load more members";
        state.entities[action.meta.arg] = entity;
      })
      .addMatcher(
        isAnyOf(fetchProjectMembers.pending, resyncProjectMembers.pending, loadMoreProjectMembers.pending),
        (state, action) => {
          const entity = getEntity(state, action.meta.arg);
          entity.status = REQUEST_STATUS.LOADING;
          entity.error = null;
          state.entities[action.meta.arg] = entity;
        },
      )
      .addMatcher(isAnyOf(fetchProjectMembers.fulfilled, resyncProjectMembers.fulfilled), (state, action) => {
        const { projectId, members, total } = action.payload;
        state.entities[projectId] = { data: members, total, status: REQUEST_STATUS.SUCCEEDED, error: null };
      })
      .addMatcher(isAnyOf(fetchProjectMembers.rejected, resyncProjectMembers.rejected), (state, action) => {
        const entity = getEntity(state, action.meta.arg);
        entity.status = REQUEST_STATUS.FAILED;
        entity.error = action.error.message ?? "Failed to load members";
        state.entities[action.meta.arg] = entity;
      });
  },
});

export const selectProjectMembers = (state: RootState, projectId: string): TProjectMember[] | null =>
  state.members.entities[projectId]?.data ?? null;

export const selectProjectMembersTotal = (state: RootState, projectId: string): number =>
  state.members.entities[projectId]?.total ?? 0;

export const selectProjectMembersStatus = (state: RootState, projectId: string): TRequestStatus =>
  state.members.entities[projectId]?.status ?? REQUEST_STATUS.IDLE;

export const selectProjectMembersError = (state: RootState, projectId: string): string | null =>
  state.members.entities[projectId]?.error ?? null;

export default membersSlice.reducer;

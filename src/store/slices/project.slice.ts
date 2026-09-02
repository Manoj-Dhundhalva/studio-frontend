import { createAsyncThunk, createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { projectsService } from "@/services/projects";
import type { TProjectDetail } from "@/services/projects/projects.types";
import type { RootState } from "../store";
import { REQUEST_STATUS, type TRequestStatus } from "./request-status";

export { REQUEST_STATUS, type TRequestStatus };

type TProjectEntity = {
  data: TProjectDetail | null;
  status: TRequestStatus;
  error: string | null;
};

type TProjectsState = {
  entities: Record<string, TProjectEntity>;
};

const initialState: TProjectsState = {
  entities: {},
};

const getEntity = (state: TProjectsState, projectId: string): TProjectEntity =>
  state.entities[projectId] ?? { data: null, status: REQUEST_STATUS.IDLE, error: null };

export const fetchProject = createAsyncThunk("projects/fetchProject", async (projectId: string) => {
  return projectsService.getProject(projectId);
});

/**
 * Re-fetches from `GET /projects/:projectId` after a successful rename rather
 * than trusting the PATCH response alone (it omits `accessibility`), so the
 * store always reflects what the server actually persisted.
 */
export const updateProjectName = createAsyncThunk(
  "projects/updateProjectName",
  async ({ projectId, projectName }: { projectId: string; projectName: string }, { dispatch }) => {
    await projectsService.updateProjectName(projectId, projectName);
    return dispatch(fetchProject(projectId)).unwrap();
  },
);

const projectSlice = createSlice({
  name: "projects",
  initialState,
  reducers: {
    resetProject: (state, action: PayloadAction<string>) => {
      delete state.entities[action.payload];
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchProject.pending, (state, action) => {
        const entity = getEntity(state, action.meta.arg);
        entity.status = REQUEST_STATUS.LOADING;
        entity.error = null;
        state.entities[action.meta.arg] = entity;
      })
      .addCase(fetchProject.fulfilled, (state, action) => {
        state.entities[action.payload.projectId] = {
          data: action.payload,
          status: REQUEST_STATUS.SUCCEEDED,
          error: null,
        };
      })
      .addCase(fetchProject.rejected, (state, action) => {
        const entity = getEntity(state, action.meta.arg);
        entity.status = REQUEST_STATUS.FAILED;
        entity.error = action.error.message ?? "Failed to load project";
        state.entities[action.meta.arg] = entity;
      })
      .addCase(updateProjectName.pending, (state, action) => {
        const entity = getEntity(state, action.meta.arg.projectId);
        entity.status = REQUEST_STATUS.LOADING;
        entity.error = null;
        state.entities[action.meta.arg.projectId] = entity;
      })
      .addCase(updateProjectName.fulfilled, (state, action) => {
        state.entities[action.payload.projectId] = {
          data: action.payload,
          status: REQUEST_STATUS.SUCCEEDED,
          error: null,
        };
      })
      .addCase(updateProjectName.rejected, (state, action) => {
        const entity = getEntity(state, action.meta.arg.projectId);
        entity.status = REQUEST_STATUS.FAILED;
        entity.error = action.error.message ?? "Failed to rename project";
        state.entities[action.meta.arg.projectId] = entity;
      });
  },
});

export const { resetProject } = projectSlice.actions;

export const selectProject = (state: RootState, projectId: string): TProjectDetail | null =>
  state.projects.entities[projectId]?.data ?? null;

export const selectProjectStatus = (state: RootState, projectId: string): TRequestStatus =>
  state.projects.entities[projectId]?.status ?? REQUEST_STATUS.IDLE;

export const selectProjectError = (state: RootState, projectId: string): string | null =>
  state.projects.entities[projectId]?.error ?? null;

export default projectSlice.reducer;

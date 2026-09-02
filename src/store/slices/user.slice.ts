import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { usersService, type TUser } from "@/services/users";
import type { RootState } from "../store";
import { REQUEST_STATUS, type TRequestStatus } from "./request-status";

export { REQUEST_STATUS, type TRequestStatus };

type TUserState = {
  data: TUser | null;
  status: TRequestStatus;
  error: string | null;
};

const initialState: TUserState = {
  data: null,
  status: REQUEST_STATUS.IDLE,
  error: null,
};

export const fetchCurrentUser = createAsyncThunk("user/fetchCurrentUser", async () => {
  return usersService.getCurrentUser();
});

/**
 * Re-fetches from `GET /users/me` after a successful update rather than
 * trusting the PATCH response alone, so the store always reflects what the
 * server actually persisted.
 */
export const updateUsername = createAsyncThunk("user/updateUsername", async (username: string, { dispatch }) => {
  await usersService.updateUsername(username);
  return dispatch(fetchCurrentUser()).unwrap();
});

const userSlice = createSlice({
  name: "user",
  initialState,
  reducers: {
    resetUser: (state) => {
      state.data = null;
      state.status = REQUEST_STATUS.IDLE;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCurrentUser.pending, (state) => {
        state.status = REQUEST_STATUS.LOADING;
        state.error = null;
      })
      .addCase(fetchCurrentUser.fulfilled, (state, action) => {
        state.status = REQUEST_STATUS.SUCCEEDED;
        state.data = action.payload;
      })
      .addCase(fetchCurrentUser.rejected, (state, action) => {
        state.status = REQUEST_STATUS.FAILED;
        state.error = action.error.message ?? "Failed to load profile";
      })
      .addCase(updateUsername.pending, (state) => {
        state.status = REQUEST_STATUS.LOADING;
        state.error = null;
      })
      .addCase(updateUsername.fulfilled, (state, action) => {
        state.status = REQUEST_STATUS.SUCCEEDED;
        state.data = action.payload;
      })
      .addCase(updateUsername.rejected, (state, action) => {
        state.status = REQUEST_STATUS.FAILED;
        state.error = action.error.message ?? "Failed to update username";
      });
  },
});

export const { resetUser } = userSlice.actions;

export const selectCurrentUser = (state: RootState): TUser | null => state.user.data;
export const selectUserStatus = (state: RootState): TRequestStatus => state.user.status;
export const selectUserError = (state: RootState): string | null => state.user.error;

export default userSlice.reducer;

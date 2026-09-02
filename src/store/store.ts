import { configureStore } from "@reduxjs/toolkit";
import userReducer from "./slices/user.slice";
import projectsReducer from "./slices/project.slice";
import membersReducer from "./slices/members.slice";

export const store = configureStore({
  reducer: {
    user: userReducer,
    projects: projectsReducer,
    members: membersReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

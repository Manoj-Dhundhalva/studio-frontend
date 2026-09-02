import { configureStore } from "@reduxjs/toolkit";
import userReducer from "./slices/user.slice";
import projectsReducer from "./slices/project.slice";

export const store = configureStore({
  reducer: {
    user: userReducer,
    projects: projectsReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

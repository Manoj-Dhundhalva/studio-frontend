import { configureStore } from "@reduxjs/toolkit";
import userReducer from "./slices/user.slice";
import projectsReducer from "./slices/project.slice";
import membersReducer from "./slices/members.slice";
import canvasReducer from "./slices/canvas.slice";
import slidesReducer from "./slices/slides.slice";
import presenceReducer from "./slices/presence.slice";

export const store = configureStore({
  reducer: {
    user: userReducer,
    projects: projectsReducer,
    members: membersReducer,
    canvas: canvasReducer,
    slides: slidesReducer,
    presence: presenceReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

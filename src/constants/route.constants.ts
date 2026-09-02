export const ROUTE_PATH = {
  HOME: {
    ROOT: "/",
  },
  PROFILE: {
    ROOT: "/profile",
  },
  PROJECT: {
    ROOT: "/project/:projectId",
  },
  AUTH: {
    ROOT: "/auth",
    LOGIN: {
      ROOT: "/auth/login",
    },
    CALLBACK: {
      ROOT: "/auth/callback",
    },
  },
} as const;

export const ROUTE_PATH = {
  HOME: {
    ROOT: "/",
  },
  PROFILE: {
    ROOT: "/profile",
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

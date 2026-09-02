export const ROUTE_PATH = {
  HOME: {
    ROOT: "/",
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

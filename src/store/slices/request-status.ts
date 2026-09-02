export const REQUEST_STATUS = {
  IDLE: "idle",
  LOADING: "loading",
  SUCCEEDED: "succeeded",
  FAILED: "failed",
} as const;

export type TRequestStatus = (typeof REQUEST_STATUS)[keyof typeof REQUEST_STATUS];

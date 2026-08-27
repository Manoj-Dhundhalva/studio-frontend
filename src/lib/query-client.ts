import { QueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";

const MAX_QUERY_RETRIES = 2;

/**
 * Retrying a 4xx just replays a request the server already rejected on its
 * merits. Only network/timeout failures, 5xx, and the two explicitly retryable
 * 4xx codes are worth a second attempt.
 */
const RETRYABLE_CLIENT_STATUSES = new Set([408, 429]);

function shouldRetry(failureCount: number, error: unknown): boolean {
  if (failureCount >= MAX_QUERY_RETRIES) return false;

  if (isAxiosError(error)) {
    const status = error.response?.status;

    // No response at all — network error or timeout. Worth retrying.
    if (status === undefined) return true;

    if (status < 500) return RETRYABLE_CLIENT_STATUSES.has(status);
  }

  return true;
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: shouldRetry,
      staleTime: 60 * 1000,
      gcTime: 5 * 60 * 1000,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: false,
    },
  },
});

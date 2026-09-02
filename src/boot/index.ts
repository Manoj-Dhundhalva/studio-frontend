import "@/config/env";
import { apiService } from "@/services/api";
import { authService } from "@/services/auth";
import { store } from "@/store";
import { fetchCurrentUser } from "@/store/slices/user.slice";
import { ROUTE_PATH } from "@/constants/route.constants";

// Reclaim cache entries that expired but were never read again. Loaded lazily so
// Dexie stays out of the entry chunk.
void import("@/services/cache").then(({ cache }) => cache.pruneExpired());

/**
 * Clears the stale/revoked token and forces the user back to login. A hard
 * redirect (not `navigate()`) because this runs outside the React tree, and
 * `replace` so the invalidated session isn't still one "back" away.
 */
function handleUnauthorized(): void {
  authService.clearToken();

  if (!window.location.pathname.startsWith(ROUTE_PATH.AUTH.ROOT)) {
    window.location.replace(ROUTE_PATH.AUTH.LOGIN.ROOT);
  }
}

// Wire the persisted access token into outgoing requests, and bounce to
// login on a 401 so an expired/revoked session can't keep making requests.
apiService.configureAuth(authService.getToken, handleUnauthorized);

// Load the current user's profile into the store as soon as the app boots,
// so it's available everywhere without every consumer re-fetching it.
if (authService.isAuthenticated()) {
  void store.dispatch(fetchCurrentUser());
}

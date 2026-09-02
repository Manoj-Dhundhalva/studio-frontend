import "@/config/env";
import { apiService } from "@/services/api";
import { authService } from "@/services/auth";
import { store } from "@/store";
import { fetchCurrentUser } from "@/store/slices/user.slice";

// Reclaim cache entries that expired but were never read again. Loaded lazily so
// Dexie stays out of the entry chunk.
void import("@/services/cache").then(({ cache }) => cache.pruneExpired());

// Wire the persisted access token into outgoing requests, and clear it on a
// 401 so a stale/revoked token doesn't keep getting resent.
apiService.configureAuth(authService.getToken, authService.clearToken);

// Load the current user's profile into the store as soon as the app boots,
// so it's available everywhere without every consumer re-fetching it.
if (authService.isAuthenticated()) {
  void store.dispatch(fetchCurrentUser());
}

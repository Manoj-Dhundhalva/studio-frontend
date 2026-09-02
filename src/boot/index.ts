import "@/config/env";
import { apiService } from "@/services/api";
import { authService } from "@/services/auth";

// Reclaim cache entries that expired but were never read again. Loaded lazily so
// Dexie stays out of the entry chunk.
void import("@/services/cache").then(({ cache }) => cache.pruneExpired());

// Wire the persisted access token into outgoing requests, and clear it on a
// 401 so a stale/revoked token doesn't keep getting resent.
apiService.configureAuth(authService.getToken, authService.clearToken);

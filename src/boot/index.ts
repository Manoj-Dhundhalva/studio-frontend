import "@/config/env";

// Reclaim cache entries that expired but were never read again. Loaded lazily so
// Dexie stays out of the entry chunk.
void import("@/services/cache").then(({ cache }) => cache.pruneExpired());

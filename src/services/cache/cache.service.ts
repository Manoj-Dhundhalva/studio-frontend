import { db } from "./cache.db";
import type { TCacheKey, TCacheRecord } from "./cache.types";

/**
 * IndexedDB is unavailable or throws outright in Safari private mode, some
 * embedded webviews, and when a user blocks site data. The cache is an
 * optimisation, never a source of truth, so every operation degrades to a
 * miss/no-op rather than rejecting.
 */
async function safely<T>(operation: () => Promise<T>, fallback: T, context: string): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    console.error(`Cache operation failed (${context})`, error);
    return fallback;
  }
}

class CacheService {
  /** @param ttl Lifetime in milliseconds. `0` expires immediately; omit for no expiry. */
  async set<T>(key: TCacheKey, value: T, ttl?: number): Promise<void> {
    const record: TCacheRecord<T> = { key, value };

    // `ttl != null` rather than a truthiness check, so `ttl: 0` means
    // "already expired" instead of "never expires".
    if (ttl != null) {
      record.expiry = Date.now() + ttl;
    }

    await safely(() => db.cache.put(record), undefined, `set ${key}`);
  }

  async get<T>(key: TCacheKey): Promise<T | null> {
    return safely(
      async () => {
        const record = await db.cache.get(key);

        if (!record) return null;

        if (record.expiry != null && Date.now() > record.expiry) {
          await db.cache.delete(key);
          return null;
        }

        return record.value as T;
      },
      null,
      `get ${key}`,
    );
  }

  async delete(key: TCacheKey): Promise<void> {
    await safely(() => db.cache.delete(key), undefined, `delete ${key}`);
  }

  async clear(): Promise<void> {
    await safely(() => db.cache.clear(), undefined, "clear");
  }

  /**
   * Drops every expired record. Entries that are written but never read again
   * are otherwise never reclaimed — call this on app start.
   */
  async pruneExpired(): Promise<number> {
    return safely(() => db.cache.where("expiry").below(Date.now()).delete(), 0, "pruneExpired");
  }
}

export const cache = new CacheService();

import Dexie, { type Table } from "dexie";
import type { TCacheKey, TCacheRecord } from "./cache.types";

class CacheDB extends Dexie {
  cache!: Table<TCacheRecord<unknown>, TCacheKey>;

  constructor() {
    super("cache");
    // `expiry` is indexed so expired records can be pruned with a range query
    // instead of a full table scan.
    this.version(1).stores({ cache: "key, expiry" });
  }
}

export const db = new CacheDB();

/**
 * Browser indexer service — wraps server-safe core with IndexedDB cache.
 * For API routes, import from `@/app/services/indexerServer` instead.
 */

import {
  IndexerResultWithMeta,
  WrapPeriod,
  getCacheKey,
  isCacheValid,
} from "@/app/utils/indexer";
import { getCacheEntry, setCacheEntry } from "@/app/utils/indexedDbCache";
import { runIndexingCore } from "./indexerCore";
import { indexerWarn } from "@/app/utils/indexerDebug";

/**
 * Index account with browser IndexedDB cache: return cached data if fresh,
 * else index and optionally return stale cache while re-indexing in background.
 */
export async function indexAccount(
  accountId: string,
  network: "mainnet" | "testnet" = "mainnet",
  period: WrapPeriod = "monthly",
): Promise<IndexerResultWithMeta> {
  const cacheKey = getCacheKey(accountId, network, period);
  const cached = await getCacheEntry(cacheKey);

  if (cached && isCacheValid(cached)) {
    return {
      result: cached.result,
      fromCache: true,
      cacheTimestamp: cached.timestamp,
    };
  }

  if (cached && !isCacheValid(cached)) {
    void runIndexingCore(accountId, network, period, true).then(
      (result) => {
        setCacheEntry(cacheKey, { result, timestamp: Date.now() });
      },
      (err) => {
        indexerWarn("Background refresh failed", err);
      },
    );
    return {
      result: cached.result,
      fromCache: true,
      cacheTimestamp: cached.timestamp,
      refreshingInBackground: true,
    };
  }

  const result = await runIndexingCore(accountId, network, period, false);
  await setCacheEntry(cacheKey, { result, timestamp: Date.now() });
  return {
    result,
    fromCache: false,
  };
}

export { runIndexingCore } from "./indexerCore";

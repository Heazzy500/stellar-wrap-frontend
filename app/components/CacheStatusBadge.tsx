"use client";

import { useWrapStore } from "@/app/store/wrapStore";
import { useCallback } from "react";
import { Database, RefreshCw, Loader2, Check } from "lucide-react";
import { invalidateCache, getCachedDataKey } from "@/app/services/cacheService";
import { useOnlineStatus } from "@/app/hooks/useOnlineStatus";

function formatCacheAge(timestamp: number): string {
  const ageMs = Date.now() - timestamp;
  const ageMin = Math.floor(ageMs / 60_000);
  const ageSec = Math.floor((ageMs % 60_000) / 1000);
  if (ageMin >= 60) {
    const h = Math.floor(ageMin / 60);
    return h === 1 ? "1 hour ago" : `${h} hours ago`;
  }
  if (ageMin > 0) return ageMin === 1 ? "1 min ago" : `${ageMin} min ago`;
  return ageSec <= 10 ? "just now" : `${ageSec}s ago`;
}

const STALE_CACHE_THRESHOLD_MS = 30 * 60 * 1000;

export function CacheStatusBadge() {
  const { cacheMeta, address, network, period, isRefreshing, bumpRefreshToken, setRefreshing } = useWrapStore();
  const isOnline = useOnlineStatus();

  const isStale =
    cacheMeta?.fromCache === true &&
    cacheMeta.cacheTimestamp != null &&
    Date.now() - cacheMeta.cacheTimestamp > STALE_CACHE_THRESHOLD_MS;

  const handleRefresh = useCallback(async () => {
    if (!address || !isOnline || isRefreshing) return;
    const key = getCachedDataKey(
      address,
      network as "mainnet" | "testnet",
      period as "weekly" | "biweekly" | "monthly" | "yearly",
    );
    setRefreshing(true);
    await invalidateCache(key);
    bumpRefreshToken();
  }, [address, isOnline, isRefreshing, network, period, bumpRefreshToken, setRefreshing]);

  if (!cacheMeta) return null;

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-xl p-4 space-y-2">
      {cacheMeta.fromCache ? (
        <>
          <div className="flex items-center gap-2 text-sm">
            <Database className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="font-medium text-white/90">
              {cacheMeta.offline ? "Using offline cached data" : "Using cached data"}
            </span>
          </div>
          {cacheMeta.cacheTimestamp != null && (
            <p className="text-xs text-neutral-400">
              Cached {formatCacheAge(cacheMeta.cacheTimestamp)}
            </p>
          )}
          {isStale && (
            <p className="text-xs text-amber-400/90">
              This data may be outdated. Consider refreshing.
            </p>
          )}
        </>
      ) : (
        <div className="flex items-center gap-2 text-sm">
          <Check className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="font-medium text-white/90">Using fresh data</span>
        </div>
      )}
      {cacheMeta.refreshingInBackground && (
        <div className="flex items-center gap-2 text-xs text-amber-400/90">
          <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
          <span>Refreshing in background...</span>
        </div>
      )}
      {isRefreshing && (
        <div className="flex items-center gap-2 text-xs text-emerald-400/90">
          <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
          <span>Refreshing data...</span>
        </div>
      )}
      <button
        type="button"
        onClick={handleRefresh}
        disabled={!isOnline || isRefreshing}
        className="flex items-center gap-2 mt-2 px-3 py-1.5 rounded-lg border border-white/20 bg-white/5 hover:bg-white/10 text-white/80 hover:text-white text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50"
      >
        <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
        {isRefreshing ? "Refreshing..." : isOnline ? "Refresh data" : "Refresh unavailable offline"}
      </button>
    </div>
  );
}

"use client";

import { useMemo } from "react";
import { RefreshCw, AlertTriangle } from "lucide-react";
import { useRecentLedgers } from "@/src/hooks/useRecentLedgers";
import { useWrapStore } from "@/app/store/wrapStore";
import { LedgerRow } from "./LedgerRow";

interface RecentLedgersProps {
  /** How many ledgers to show. Defaults to 20. */
  limit?: number;
}

/**
 * Displays the most recently closed Stellar ledgers for the currently
 * selected network, backed by React Query (see `useRecentLedgers`) instead
 * of a `useEffect` fetch: results are cached and deduplicated per
 * (network, limit), background refetches don't clear the visible list, and
 * a manual refresh optimistically flips to a pending state with guaranteed
 * rollback on failure.
 */
export function RecentLedgers({ limit = 20 }: RecentLedgersProps) {
  // Selector form (not destructuring the whole store) so this component
  // only re-renders when `network` itself changes, not on unrelated store
  // updates.
  const network = useWrapStore((state) => state.network);

  const { ledgers, isLoading, isError, error, isRefreshing, refreshError, refresh } =
    useRecentLedgers(network, limit);

  // Stable list even when `ledgers` is momentarily undefined between
  // network switches, so the row list doesn't unmount/remount unnecessarily.
  const rows = useMemo(() => ledgers ?? [], [ledgers]);

  return (
    <section
      aria-label="Recent ledgers"
      className="rounded-2xl border border-white/10 bg-black/40 p-6 backdrop-blur-xl"
    >
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-black uppercase tracking-wide text-white">Recent Ledgers</h2>
        <button
          type="button"
          onClick={refresh}
          disabled={isRefreshing}
          aria-busy={isRefreshing}
          className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
          {isRefreshing ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      {refreshError && (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          <span>Refresh failed: {refreshError.message}. Showing the last known list.</span>
        </div>
      )}

      {isLoading ? (
        <ul className="space-y-2" aria-label="Loading recent ledgers">
          {Array.from({ length: 5 }).map((_, index) => (
            <li
              key={index}
              className="h-14 animate-pulse rounded-xl border border-white/5 bg-white/5"
            />
          ))}
        </ul>
      ) : isError ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-8 text-center">
          <AlertTriangle className="h-6 w-6 text-red-400" />
          <p className="text-sm text-red-400">
            Couldn&apos;t load recent ledgers{error ? `: ${error.message}` : "."}
          </p>
          <button
            type="button"
            onClick={refresh}
            className="rounded-full bg-red-500/20 px-4 py-2 text-xs font-bold text-red-400 transition-colors hover:bg-red-500/30"
          >
            Try again
          </button>
        </div>
      ) : rows.length === 0 ? (
        <p className="py-8 text-center text-sm text-white/50">No ledgers to show yet.</p>
      ) : (
        <ul className="space-y-2">
          {rows.map((ledger) => (
            <LedgerRow key={ledger.id} ledger={ledger} />
          ))}
        </ul>
      )}
    </section>
  );
}

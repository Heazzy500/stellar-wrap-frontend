"use client";

import { useRouter } from "next/navigation";
import { Inbox, RefreshCw, Globe2, CalendarRange } from "lucide-react";
import { useWrapStore, type WrapPeriod } from "@/app/store/wrapStore";

interface ZeroActivityEmptyStateProps {
  /** Optional override for the selected period label */
  periodLabel?: string;
  className?: string;
}

const PERIOD_LABELS: Record<WrapPeriod, string> = {
  weekly: "past week",
  monthly: "past month",
  yearly: "past year",
};

export function ZeroActivityEmptyState({
  periodLabel,
  className = "",
}: ZeroActivityEmptyStateProps) {
  const router = useRouter();
  const { period, network, setPeriod, setNetwork, setResult, setStatus, reset } =
    useWrapStore();

  const label = periodLabel ?? PERIOD_LABELS[period] ?? "selected period";
  const otherNetwork = network === "mainnet" ? "testnet" : "mainnet";
  const nextPeriod: WrapPeriod =
    period === "weekly" ? "monthly" : period === "monthly" ? "yearly" : "weekly";

  const startFresh = (navigateTo: string) => {
    setResult(null);
    setStatus("idle");
    router.push(navigateTo);
  };

  return (
    <div
      className={`relative z-20 flex flex-col items-center justify-center text-center px-6 py-12 max-w-lg mx-auto ${className}`}
      data-testid="zero-activity-empty-state"
      role="status"
      aria-live="polite"
    >
      <div
        className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-white/15 bg-black/40"
        aria-hidden="true"
      >
        <Inbox className="h-8 w-8 text-white/70" />
      </div>

      <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight mb-3">
        No activity in this period
      </h2>
      <p className="text-sm sm:text-base text-white/60 mb-8 leading-relaxed">
        This account is valid, but we found zero transactions for the {label} on{" "}
        <span className="text-white/80 font-semibold">{network}</span>. Try a
        wider window or switch networks — no mock stats here.
      </p>

      <div className="flex flex-col sm:flex-row flex-wrap items-stretch justify-center gap-3 w-full">
        <button
          type="button"
          onClick={() => {
            setPeriod(nextPeriod);
            startFresh("/loading");
          }}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/5 px-4 py-3 text-sm font-semibold text-white hover:bg-white/10 transition-colors"
        >
          <CalendarRange className="h-4 w-4" aria-hidden="true" />
          Try {PERIOD_LABELS[nextPeriod]}
        </button>

        <button
          type="button"
          onClick={() => {
            setNetwork(otherNetwork);
            startFresh("/loading");
          }}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/5 px-4 py-3 text-sm font-semibold text-white hover:bg-white/10 transition-colors"
        >
          <Globe2 className="h-4 w-4" aria-hidden="true" />
          Switch to {otherNetwork}
        </button>

        <button
          type="button"
          onClick={() => {
            reset();
            router.push("/connect");
          }}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--color-theme-primary)]/40 bg-[var(--color-theme-primary)]/15 px-4 py-3 text-sm font-semibold text-white hover:bg-[var(--color-theme-primary)]/25 transition-colors"
        >
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
          Change wallet
        </button>
      </div>
    </div>
  );
}

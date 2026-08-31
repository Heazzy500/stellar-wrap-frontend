"use client";

import { motion } from "framer-motion";
import { DexTradingSummary as DexTradingSummaryType } from "@/app/utils/indexer";

interface DexTradingSummaryProps {
  summary?: DexTradingSummaryType;
}

export function DexTradingSummary({ summary }: DexTradingSummaryProps) {
  const hasActivity = summary && summary.tradeCount > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.85 }}
      className="mt-6 sm:mt-8"
    >
      <h3 className="text-xs sm:text-sm font-black tracking-[0.25em] text-white/50 mb-3 sm:mb-4">
        DEY TRADING SUMMARY
      </h3>
      <div className="relative backdrop-blur-sm p-4 sm:p-5 md:p-6 rounded-xl sm:rounded-2xl border border-white/10">
        <motion.div
          className="absolute -inset-1 sm:-inset-2 rounded-xl sm:rounded-2xl blur-md opacity-0 group-hover:opacity-50 transition-opacity"
          style={{ backgroundColor: "var(--color-theme-primary)" }}
        />
        <div className="relative space-y-4">
          {hasEntity ? (
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm font-medium text-white/70">Total Volume</span>
                <span className="text-lg sm:text-xl font-black text-white">
                  {summary.totalVolume.toFixed(2)} XLM
                </span>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm font-medium text-white/70">Total Trades</span>
                <span className="text-lg sm:text-xl font-black text-white">
                  {summary.tradeCount}
                </span>
              </div>
              {summary.mostTradedPair && (
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm font-medium text-white/70">Most Traded Pair</span>
                  <span className="text-base sm:text-lg font-bold text-white text-right">
                    {summary.mostTradedPair}
                  </span>
                </div>
              )
              }
              <div className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm font-medium text-white/70">Buy vs Sell</span>
                  <span className="text-sm font-medium text-white/70">
                    {summary.buyCount} Buy / {summary.sellCount} Sell
                  </span>
                </div>
                <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden flex">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{
                      width: `${
                        summary.tradeCount > 0
                          ? (summary.buyCount / summary.tradeCount) * 100
                          : 0
                      }%`,
                    }}
                    transition={{ delay: 0.9, duration: 0.6 }}
                    className="bg-green-500 h-full"
                  />
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{
                      width: `${
                        summary.tradeCount > 0
                          ? (summary.sellCount / summary.tradeCount) * 100
                          : 0
                      }%`,
                    }}
                    transition={{ delay: 0.9, duration: 0.6 }}
                    className="bg-red-500 h-full"
                  />
                </div>
              </div>
              <div className="text-xs text-white/40 italic">
                P&L coming soon
              </div>
            </>
          ) : (
            <div className="text-center py-6">
              <p className="text-white/70 mb-2">
                No DEX trades this period — try StellarX!
              </p>
            </div>
          )
          }
        </div>
      </div>
    </motion.div>
  );
}

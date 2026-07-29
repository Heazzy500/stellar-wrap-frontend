
"use client";

import { useState, useRef } from "react";
import { useWrapStore } from "@/app/store/wrapStore";
import { CacheStatusBadge } from "@/app/components/CacheStatusBadge";
import { useTheme } from "@/app/hooks/useTheme";

export default function ShareCardPage() {
  const [shareOpen, setShareOpen] = useState(false);
  const shareMenuRef = useRef<HTMLDivElement | null>(null);
  const shareBtnRef = useRef<HTMLButtonElement | null>(null);
  const shareImageRef = useRef<HTMLDivElement>(null!);

  const { color } = useTheme();
  const { address: walletAddress, network, result, cacheMeta, status } = useWrapStore();

  return (
    <div className="min-h-screen bg-black text-white px-4 py-8">
      <div className="max-w-md mx-auto space-y-6">
        {/* Title */}
        <div className="text-center">
          <h1 className="text-2xl font-bold">Your Stellar Wrap</h1>
          <p className="text-sm text-neutral-400 mt-1">
            {walletAddress
              ? `\( {walletAddress.slice(0, 6)}... \){walletAddress.slice(-4)}`
              : "No wallet connected"}
          </p>
        </div>

        {/* Freshness Indicator - main requirement of #262 */}
        <CacheStatusBadge />

        {/* Summary Card */}
        <div
          ref={shareImageRef}
          className="rounded-2xl border border-white/10 bg-white/5 p-6 space-y-4"
        >
          {status === "loading" && (
            <p className="text-center text-neutral-400">Loading your wrap...</p>
          )}

          {status === "error" && (
            <p className="text-center text-red-400">Failed to load wrap data.</p>
          )}

          {result && (
            <>
              <div className="text-center">
                <p className="text-4xl font-bold">{result.totalTransactions}</p>
                <p className="text-sm text-neutral-400">Total Transactions</p>
              </div>

              <div className="text-center">
                <p className="text-xl font-semibold">{result.persona}</p>
                <p className="text-sm text-neutral-400 mt-1">
                  {result.personaDescription}
                </p>
              </div>

              {result.dapps && result.dapps.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-2">Top dApps</p>
                  <div className="space-y-1">
                    {result.dapps.slice(0, 3).map((dapp) => (
                      <div
                        key={dapp.name}
                        className="flex justify-between text-sm"
                      >
                        <span>{dapp.name}</span>
                        <span className="text-neutral-400">
                          {dapp.interactions} txs
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Share Button */}
        <button
          ref={shareBtnRef}
          onClick={() => setShareOpen(!shareOpen)}
          className="w-full py-3 rounded-xl bg-white text-black font-semibold hover:bg-neutral-200 transition"
        >
          Share your Wrap
        </button>

        {/* Simple share menu */}
        {shareOpen && (
          <div
            ref={shareMenuRef}
            className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm space-y-2"
          >
            <p className="text-neutral-400">Share options coming soon...</p>
            <button
              onClick={() => setShareOpen(false)}
              className="text-xs text-neutral-500 underline"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
                        }

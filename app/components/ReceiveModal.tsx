"use client";

import React, { useState, useEffect } from "react";
import { X, Copy, Check, QrCode, AlertCircle, ArrowDownLeft } from "lucide-react";
import { useWrapStore } from "@/app/store/wrapStore";
import { useTheme } from "@/app/context/ThemeContext";

export interface ReceiveModalProps {
  isOpen: boolean;
  onClose: () => void;
  address?: string;
  network?: string;
  assetCode?: string;
}

export function ReceiveModal({
  isOpen,
  onClose,
  address: customAddress,
  network: customNetwork,
  assetCode = "XLM",
}: ReceiveModalProps) {
  const { address: storeAddress, network: storeNetwork } = useWrapStore();
  const { mode } = useTheme();
  const [copied, setCopied] = useState(false);

  const activeAddress = customAddress || storeAddress;
  const activeNetwork = customNetwork || storeNetwork || "MAINNET";

  // Handle ESC key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleCopy = async () => {
    if (!activeAddress) return;
    try {
      await navigator.clipboard.writeText(activeAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  const isDarkMode = mode === "dark";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="receive-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in"
    >
      <div
        className={`relative w-full max-w-md rounded-2xl p-6 shadow-2xl border transition-colors ${
          isDarkMode
            ? "bg-zinc-900 border-zinc-800 text-zinc-100"
            : "bg-white border-zinc-200 text-zinc-900"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-zinc-700/40">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500">
              <ArrowDownLeft className="w-5 h-5" />
            </div>
            <div>
              <h2 id="receive-modal-title" className="text-lg font-bold">
                Receive Assets
              </h2>
              <p className="text-xs text-zinc-400">
                Network: <span className="font-semibold uppercase text-emerald-400">{activeNetwork}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close receive modal"
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60 transition-colors focus-visible:outline-emerald-500"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content / States */}
        <div className="mt-5 space-y-5">
          {!activeAddress ? (
            /* Empty State */
            <div className="flex flex-col items-center justify-center py-8 text-center space-y-3">
              <div className="p-3 rounded-full bg-amber-500/10 text-amber-500">
                <AlertCircle className="w-8 h-8" />
              </div>
              <h3 className="text-sm font-semibold">No Wallet Connected</h3>
              <p className="text-xs text-zinc-400 max-w-xs">
                Please connect your Stellar wallet or provide an address to view your deposit QR code and address.
              </p>
            </div>
          ) : (
            <>
              {/* QR Code Placeholder Box */}
              <div className="flex flex-col items-center justify-center p-6 rounded-xl bg-zinc-950/40 border border-zinc-800/60">
                <div className="p-4 bg-white rounded-xl shadow-inner mb-3">
                  {/* Visual SVG QR representation */}
                  <QrCode className="w-36 h-36 text-black" />
                </div>
                <span className="text-xs text-zinc-400 font-medium">
                  Scan to send {assetCode} or tokens
                </span>
              </div>

              {/* Address Display & Copy */}
              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1.5">
                  Your Stellar Address
                </label>
                <div className="flex items-center gap-2">
                  <div
                    className={`flex-1 px-3 py-2 text-xs font-mono rounded-xl border truncate select-all ${
                      isDarkMode
                        ? "bg-zinc-950 border-zinc-800 text-zinc-300"
                        : "bg-zinc-50 border-zinc-200 text-zinc-800"
                    }`}
                  >
                    {activeAddress}
                  </div>
                  <button
                    onClick={handleCopy}
                    aria-label="Copy Stellar Address"
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-all active:scale-95 shadow focus-visible:outline-emerald-500"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Notice Banner */}
              <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-800/30 text-xs text-emerald-300 flex items-start gap-2">
                <div className="mt-0.5">ℹ️</div>
                <p>
                  Only send Stellar network assets (XLM, Soroban tokens) to this address. Sending unsupported assets may result in permanent loss.
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

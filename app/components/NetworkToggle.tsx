"use client";

/**
 * NetworkToggle — optimistic network switch component.
 *
 * Behaviour
 * ─────────
 * 1. User clicks the toggle button.
 * 2. If a live session exists, a confirmation dialog is shown first.
 * 3. Once confirmed (or if no session), `beginOptimisticSwitch` applies the
 *    new network to the UI immediately (no waiting for the server).
 * 4. A lightweight "confirmation" step (clearing caches, re-initialising the
 *    contract bridge, verifying no rate-limit block) runs async with a
 *    configurable timeout.
 * 5a. On success → `commitNetworkSwitch` finalises the state; phase → "committed".
 * 5b. On any failure (rejection, timeout, rate limit, wallet mismatch,
 *    connectivity) → `rollbackNetworkSwitch` restores the previous network.
 * 6. An error banner is shown when phase === "rolled-back" and cleared on
 *    dismiss or after an auto-dismiss timeout.
 *
 * Decoupling
 * ──────────
 * All network state lives in `useWrapStore`. This component is purely
 * presentational + orchestration; it holds no derived / duplicated state.
 *
 * Styling
 * ───────
 * Tailwind classes only. CSS custom-property values (e.g. themed colours) are
 * injected through the `style` prop, matching the existing project pattern.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Network as NetworkIcon,
  Loader2,
  AlertCircle,
  CheckCircle2,
  XCircle,
  X,
} from "lucide-react";
import { useWrapStore } from "../store/wrapStore";
import { NETWORKS, Network } from "../../src/config";
import { getNetworkDisplayName } from "../../src/utils/networkUtils";
import { clearContractCache } from "../utils/contractBridge";
import { useRateLimitStore } from "../../src/store/rateLimitStore";
import type { NetworkSwitchFailureReason } from "../types/networkSwitch";

// ─── Constants ───────────────────────────────────────────────────────────────

/** Max ms to wait for the async confirmation step before timing out. */
const SWITCH_TIMEOUT_MS = 8_000;

/** After a successful commit, auto-clear the "committed" badge after this delay. */
const COMMIT_CLEAR_MS = 2_000;

/** Auto-dismiss rolled-back error banner after this delay (ms). 0 = no auto-dismiss. */
const ERROR_AUTO_DISMISS_MS = 6_000;

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Human-readable copy for each failure reason.
 * Kept here (near the component) to stay co-located with the UI it drives.
 */
function getErrorCopy(reason: NetworkSwitchFailureReason): string {
  switch (reason) {
    case "user-rejected":
      return "Network switch cancelled.";
    case "timeout":
      return "Network switch timed out. Please try again.";
    case "rate-limited":
      return "Rate limited — please wait a moment, then try again.";
    case "wallet-mismatch":
      return "Your wallet is on a different network. Switch networks in your wallet and try again.";
    case "network-error":
      return "Connection error. Check your internet connection and try again.";
    default:
      return "Network switch failed. The previous network has been restored.";
  }
}

/**
 * Runs the async side-effects required to confirm a network switch is valid:
 *  - Ensures we are not currently rate-limited
 *  - Clears the contract cache (idempotent)
 *
 * Returns void on success; throws a typed error on failure.
 */
async function confirmNetworkSwitch(
  targetNetwork: Network,
  isRateLimited: boolean,
  abortSignal: AbortSignal,
): Promise<void> {
  // Guard: cannot switch while Horizon is rate-limiting us
  if (isRateLimited) {
    throw Object.assign(new Error("rate-limited"), {
      failureReason: "rate-limited" as NetworkSwitchFailureReason,
    });
  }

  // Abort-check — useful if the component unmounts mid-flight
  if (abortSignal.aborted) {
    throw Object.assign(new Error("user-rejected"), {
      failureReason: "user-rejected" as NetworkSwitchFailureReason,
    });
  }

  // Clear any stale Soroban contract instance for the old network
  clearContractCache();

  // Simulate any network-verification work here if needed.
  // For now the lightweight async work is the cache clear + abort check above.
  // A small yield to the event loop keeps the UI responsive.
  await new Promise<void>((resolve, reject) => {
    const id = setTimeout(resolve, 0);
    abortSignal.addEventListener("abort", () => {
      clearTimeout(id);
      reject(
        Object.assign(new Error("user-rejected"), {
          failureReason: "user-rejected" as NetworkSwitchFailureReason,
        }),
      );
    });
  });

  // Validate the target network is reachable (optional lightweight ping).
  // We deliberately skip a full Horizon ping here to keep the optimistic
  // switch snappy; the indexing pipeline will surface any connectivity errors.
  void targetNetwork; // acknowledge param is used in future validation
}

// ─── Component ───────────────────────────────────────────────────────────────

export function NetworkToggle() {
  const {
    network,
    status,
    phase,
    switchError,
    failureReason,
    beginOptimisticSwitch,
    commitNetworkSwitch,
    rollbackNetworkSwitch,
    clearNetworkSwitchError,
  } = useWrapStore();

  const { isRateLimited } = useRateLimitStore();

  // ── Refs for async lifecycle management ──────────────────────────────────

  /** AbortController for the in-flight confirmation step. */
  const abortRef = useRef<AbortController | null>(null);

  /** Timer for the overall switch timeout. */
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /** Timer for auto-clearing the committed / error phases. */
  const autoClearRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /** Whether the confirmation dialog for an active-session switch is open. */
  const [showConfirmation, setShowConfirmation] = useState(false);

  /** Pending network the confirmation dialog is waiting on. */
  const [pendingNetwork, setPendingNetwork] = useState<Network | null>(null);

  // ── Cleanup helpers ───────────────────────────────────────────────────────

  const clearTimers = useCallback(() => {
    if (timeoutRef.current !== null) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (autoClearRef.current !== null) {
      clearTimeout(autoClearRef.current);
      autoClearRef.current = null;
    }
  }, []);

  const abortInFlight = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    clearTimers();
  }, [clearTimers]);

  // Abort in-flight operations on unmount
  useEffect(() => {
    return () => {
      abortInFlight();
    };
  }, [abortInFlight]);

  // Auto-clear committed phase after a short success flash
  useEffect(() => {
    if (phase === "committed") {
      autoClearRef.current = setTimeout(() => {
        clearNetworkSwitchError(); // also resets phase → idle
      }, COMMIT_CLEAR_MS);
    }
    return () => {
      if (autoClearRef.current !== null) {
        clearTimeout(autoClearRef.current);
        autoClearRef.current = null;
      }
    };
  }, [phase, clearNetworkSwitchError]);

  // Auto-dismiss error banner
  useEffect(() => {
    if (phase === "rolled-back" && ERROR_AUTO_DISMISS_MS > 0) {
      autoClearRef.current = setTimeout(() => {
        clearNetworkSwitchError();
      }, ERROR_AUTO_DISMISS_MS);
    }
    return () => {
      if (autoClearRef.current !== null) {
        clearTimeout(autoClearRef.current);
        autoClearRef.current = null;
      }
    };
  }, [phase, clearNetworkSwitchError]);

  // ── Core switch logic ─────────────────────────────────────────────────────

  const performOptimisticSwitch = useCallback(
    async (newNetwork: Network) => {
      // Abort any previous in-flight switch
      abortInFlight();

      const controller = new AbortController();
      abortRef.current = controller;

      // 1. Apply the optimistic update immediately (UI shows new network now)
      beginOptimisticSwitch(newNetwork);

      // 2. Start the timeout watchdog
      timeoutRef.current = setTimeout(() => {
        abortRef.current?.abort();
        rollbackNetworkSwitch(
          "timeout",
          getErrorCopy("timeout"),
        );
      }, SWITCH_TIMEOUT_MS);

      // 3. Run async confirmation
      try {
        await confirmNetworkSwitch(newNetwork, isRateLimited, controller.signal);

        // Success — clear timeout and commit
        clearTimers();
        commitNetworkSwitch();
      } catch (err: unknown) {
        // Determine failure reason from the thrown value
        const reason: NetworkSwitchFailureReason =
          err !== null &&
          typeof err === "object" &&
          "failureReason" in err &&
          typeof (err as Record<string, unknown>).failureReason === "string"
            ? ((err as Record<string, unknown>).failureReason as NetworkSwitchFailureReason)
            : "unknown";

        clearTimers();

        // Do not double-rollback if timeout already triggered
        if (controller.signal.aborted) return;

        rollbackNetworkSwitch(reason, getErrorCopy(reason));
      } finally {
        abortRef.current = null;
      }
    },
    [
      abortInFlight,
      beginOptimisticSwitch,
      clearTimers,
      commitNetworkSwitch,
      isRateLimited,
      rollbackNetworkSwitch,
    ],
  );

  // ── Button click → dialog or immediate switch ─────────────────────────────

  const handleToggleClick = useCallback(() => {
    if (phase === "switching") return; // already switching, ignore

    const newNetwork: Network =
      network === NETWORKS.MAINNET ? NETWORKS.TESTNET : NETWORKS.MAINNET;

    if (status === "loading" || status === "ready") {
      // Show confirmation dialog for active sessions
      setPendingNetwork(newNetwork);
      setShowConfirmation(true);
    } else {
      void performOptimisticSwitch(newNetwork);
    }
  }, [phase, network, status, performOptimisticSwitch]);

  const handleConfirm = useCallback(() => {
    setShowConfirmation(false);
    if (pendingNetwork) {
      const target = pendingNetwork;
      setPendingNetwork(null);
      void performOptimisticSwitch(target);
    }
  }, [pendingNetwork, performOptimisticSwitch]);

  const handleCancel = useCallback(() => {
    setShowConfirmation(false);
    setPendingNetwork(null);
  }, []);

  // ── Derived display values ────────────────────────────────────────────────

  const isSwitching = phase === "switching";
  const isMainnet = network === NETWORKS.MAINNET;

  const networkColor = isMainnet ? "var(--color-theme-primary)" : "#FFA500";
  const networkColorRgb = isMainnet
    ? "var(--color-theme-primary-rgb)"
    : "255, 165, 0";
  const borderColor = isMainnet
    ? "rgba(var(--color-theme-primary-rgb), 0.3)"
    : "rgba(255, 165, 0, 0.3)";
  const glowColor = isMainnet
    ? "rgba(var(--color-theme-primary-rgb), 0.3)"
    : "rgba(255, 165, 0, 0.3)";
  const pulseFrom = `rgba(${networkColorRgb}, 0.5)`;
  const pulseTo = `rgba(${networkColorRgb}, 1)`;

  return (
    <>
      {/* ── Toggle button ──────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, x: 50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.3 }}
        className="fixed top-4 right-4 md:top-8 md:right-24 z-50"
      >
        <motion.button
          type="button"
          onClick={handleToggleClick}
          disabled={isSwitching}
          aria-label={
            isSwitching
              ? "Switching network…"
              : `Switch to ${isMainnet ? "Testnet" : "Mainnet"}`
          }
          aria-live="polite"
          aria-atomic="true"
          className="group relative flex items-center gap-2 md:gap-3 px-3 py-2 md:px-4 md:py-3 rounded-xl backdrop-blur-xl border transition-all disabled:opacity-70 disabled:cursor-not-allowed"
          style={{
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            borderColor,
          }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.98 }}
        >
          {/* Glow effect */}
          <motion.div
            className="absolute -inset-1 rounded-xl blur-lg opacity-0 group-hover:opacity-50 transition-opacity"
            style={{ backgroundColor: glowColor }}
          />

          {/* Icon */}
          <div className="relative flex items-center justify-center min-w-[1.25rem] min-h-[1.25rem] md:min-w-5 md:min-h-5">
            <AnimatePresence mode="wait">
              {isSwitching ? (
                <motion.span
                  key="spinner"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                >
                  <Loader2
                    className="w-4 h-4 md:w-5 md:h-5 animate-spin"
                    style={{ color: networkColor }}
                  />
                </motion.span>
              ) : phase === "committed" ? (
                <motion.span
                  key="check"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                >
                  <CheckCircle2
                    className="w-4 h-4 md:w-5 md:h-5"
                    style={{ color: networkColor }}
                  />
                </motion.span>
              ) : (
                <motion.span
                  key="icon"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                >
                  <NetworkIcon
                    className="w-4 h-4 md:w-5 md:h-5"
                    style={{ color: networkColor }}
                  />
                </motion.span>
              )}
            </AnimatePresence>
          </div>

          {/* Label */}
          <div className="relative flex flex-col items-start">
            <span className="text-[8px] md:text-[10px] font-black tracking-wider text-white/50 uppercase">
              Network
            </span>
            <span
              className="text-xs md:text-sm font-black tracking-tight"
              style={{ color: networkColor }}
            >
              {isSwitching
                ? "Switching…"
                : phase === "committed"
                  ? `${getNetworkDisplayName(network)} ✓`
                  : getNetworkDisplayName(network)}
            </span>
          </div>

          {/* Pulse dot */}
          <motion.div
            className="relative w-2 h-2 rounded-full"
            style={{ backgroundColor: networkColor }}
            animate={{
              opacity: [0.5, 1, 0.5],
              boxShadow: [
                `0 0 5px ${pulseFrom}`,
                `0 0 10px ${pulseTo}`,
                `0 0 5px ${pulseFrom}`,
              ],
            }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        </motion.button>
      </motion.div>

      {/* ── Error / rollback banner ─────────────────────────────────────────── */}
      <AnimatePresence>
        {phase === "rolled-back" && switchError && (
          <motion.div
            key="error-banner"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-20 right-4 md:right-24 z-50 flex items-start gap-3 max-w-sm w-full rounded-xl px-4 py-3 border border-red-500/40 bg-black/80 backdrop-blur-xl shadow-lg"
            role="alert"
            aria-live="assertive"
          >
            <XCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-red-300 flex-1 leading-relaxed">
              {failureReason === "rate-limited" ? (
                <>
                  <span className="font-bold">Rate limited.</span>{" "}
                  {switchError}
                </>
              ) : (
                switchError
              )}
            </p>
            <button
              type="button"
              onClick={clearNetworkSwitchError}
              aria-label="Dismiss error"
              className="text-white/40 hover:text-white/80 transition-colors flex-shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Confirmation dialog (active session) ───────────────────────────── */}
      <AnimatePresence>
        {showConfirmation && pendingNetwork && (
          <motion.div
            key="confirm-dialog"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="network-switch-title"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#12122a] border border-amber-500/30 rounded-2xl p-6 max-w-sm w-full space-y-4"
            >
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-400 mt-1 flex-shrink-0" />
                <div>
                  <h2
                    id="network-switch-title"
                    className="font-bold text-lg text-amber-400"
                  >
                    Switch Networks?
                  </h2>
                  <p className="text-sm text-white/70 mt-2">
                    You have an active wrap session. Switching to{" "}
                    <span className="font-semibold text-white/90">
                      {getNetworkDisplayName(pendingNetwork)}
                    </span>{" "}
                    will reset your current wrap data and restart indexing.
                  </p>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="flex-1 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirm}
                  className="flex-1 px-4 py-2 rounded-lg bg-amber-500/30 hover:bg-amber-500/40 text-amber-400 text-sm font-medium transition-colors"
                >
                  Switch Network
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

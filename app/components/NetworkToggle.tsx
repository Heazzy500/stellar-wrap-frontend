"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Network as NetworkIcon, Loader2 } from "lucide-react";
import { useWrapStore } from "../store/wrapStore";
import { NETWORKS, Network } from "../../src/config";
import { getNetworkDisplayName } from "../../src/utils/networkUtils";
import { clearContractCache } from "../utils/contractBridge";
import { useNetworkSwitch } from "../../src/hooks/useNetworkSwitch";
import { NetworkSwitchModal } from "./NetworkSwitchModal";

export function NetworkToggle() {
  const { network, setNetwork, status: wrapStatus, address } = useWrapStore();
  const [isSwitchingDirect, setIsSwitchingDirect] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [pendingNetwork, setPendingNetwork] = useState<Network | null>(null);

  const {
    status: switchStatus,
    isSwitching: isSigningSwitch,
    walletProvider,
    formattedFee,
    progressMessage,
    error: switchError,
    switchNetwork,
    cancelSwitch,
    clearError,
    retry,
  } = useNetworkSwitch({
    onSuccess: (result) => {
      clearContractCache();
      setNetwork(result.targetNetwork);
      setTimeout(() => {
        setShowModal(false);
        setPendingNetwork(null);
      }, 1000);
    },
  });

  useEffect(() => {
    const state = useWrapStore.getState();
    if (state.currentContractAddress == null) state.setNetwork(state.network);
  }, []);

  const handleToggleClick = () => {
    const newNetwork: Network =
      network === NETWORKS.MAINNET ? NETWORKS.TESTNET : NETWORKS.MAINNET;

    setPendingNetwork(newNetwork);

    // If a wallet address is connected, prompt for transaction signature
    if (address) {
      clearError();
      setShowModal(true);
      return;
    }

    // If data is loading or ready without wallet, show confirmation
    if (wrapStatus === "loading" || wrapStatus === "ready") {
      setShowModal(true);
    } else {
      performDirectNetworkSwitch(newNetwork);
    }
  };

  const performDirectNetworkSwitch = (newNetwork: Network) => {
    setIsSwitchingDirect(true);
    setShowModal(false);
    setPendingNetwork(null);
    clearContractCache();
    setNetwork(newNetwork);
    requestAnimationFrame(() => {
      setTimeout(() => setIsSwitchingDirect(false), 300);
    });
  };

  const handleConfirmSwitch = useCallback(() => {
    if (!pendingNetwork) return;

    if (address) {
      void switchNetwork({
        targetNetwork: pendingNetwork,
        accountAddress: address,
      });
    } else {
      performDirectNetworkSwitch(pendingNetwork);
    }
  }, [address, pendingNetwork, switchNetwork]);

  const handleCancelModal = useCallback(() => {
    cancelSwitch();
    setShowModal(false);
    setPendingNetwork(null);
  }, [cancelSwitch]);

  const isMainnet = network === NETWORKS.MAINNET;
  const isBusy = isSwitchingDirect || isSigningSwitch;

  return (
    <>
      <motion.div
        initial={{ opacity: 0, x: 50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.3 }}
        className="fixed top-4 right-4 md:top-8 md:right-24 z-50"
      >
        <motion.button
          type="button"
          onClick={handleToggleClick}
          disabled={isBusy}
          className={`group relative flex items-center gap-2 md:gap-3 px-3 py-2 md:px-4 md:py-3 rounded-xl backdrop-blur-xl border transition-all disabled:opacity-70 disabled:cursor-not-allowed bg-black/50 ${
            isMainnet ? "border-cyan-500/30 hover:border-cyan-500/50" : "border-amber-500/30 hover:border-amber-500/50"
          }`}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.98 }}
        >
          {/* Glow effect */}
          <div
            className={`absolute -inset-1 rounded-xl blur-lg opacity-0 group-hover:opacity-40 transition-opacity ${
              isMainnet ? "bg-cyan-500/30" : "bg-amber-500/30"
            }`}
          />

          {/* Network icon or loading spinner */}
          <div className="relative flex items-center justify-center min-w-[1.25rem] min-h-[1.25rem] md:min-w-5 md:min-h-5">
            {isBusy ? (
              <Loader2
                className={`w-4 h-4 md:w-5 md:h-5 animate-spin ${
                  isMainnet ? "text-cyan-400" : "text-amber-400"
                }`}
              />
            ) : (
              <NetworkIcon
                className={`w-4 h-4 md:w-5 md:h-5 ${
                  isMainnet ? "text-cyan-400" : "text-amber-400"
                }`}
              />
            )}
          </div>

          {/* Network label */}
          <div className="relative flex flex-col items-start">
            <span className="text-[8px] md:text-[10px] font-black tracking-wider text-white/50 uppercase">
              Network
            </span>
            <span
              className={`text-xs md:text-sm font-black tracking-tight ${
                isMainnet ? "text-cyan-400" : "text-amber-400"
              }`}
            >
              {isBusy ? "Switching…" : getNetworkDisplayName(network)}
            </span>
          </div>

          {/* Status indicator */}
          <motion.div
            className={`relative w-2 h-2 rounded-full ${
              isMainnet ? "bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.6)]" : "bg-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.6)]"
            }`}
            animate={{
              opacity: [0.5, 1, 0.5],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
            }}
          />
        </motion.button>
      </motion.div>

      {/* Network switch signing / confirmation modal */}
      {showModal && pendingNetwork && (
        <NetworkSwitchModal
          isOpen={showModal}
          targetNetwork={pendingNetwork}
          currentNetwork={network}
          status={switchStatus}
          walletProvider={walletProvider}
          formattedFee={formattedFee}
          progressMessage={progressMessage}
          error={switchError}
          onConfirm={handleConfirmSwitch}
          onCancel={handleCancelModal}
          onRetry={retry}
        />
      )}
    </>
  );
}

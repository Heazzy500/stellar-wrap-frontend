"use client"

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Network as NetworkIcon, Loader2, AlertCircle } from 'lucide-react';
import { useWrapStore } from '../store/wrapStore';
import { NETWORKS, Network } from '../../src/config';
import { getNetworkDisplayName } from '../../src/utils/networkUtils';
import { clearContractCache } from '../utils/contractBridge';
import { useDialogFocusManagement } from '../hooks/useDialogFocusManagement';

export function NetworkToggle() {
  const { network, setNetwork, status } = useWrapStore();
  const [isSwitching, setIsSwitching] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [pendingNetwork, setPendingNetwork] = useState<Network | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const state = useWrapStore.getState();
    if (state.currentContractAddress == null) state.setNetwork(state.network);
  }, []);

  const handleToggleClick = () => {
    const newNetwork: Network = network === NETWORKS.MAINNET ? NETWORKS.TESTNET : NETWORKS.MAINNET;
    
    // If data is loading or ready, show confirmation prompt
    if (status === 'loading' || status === 'ready') {
      setShowConfirmation(true);
      setPendingNetwork(newNetwork);
    } else {
      // Otherwise proceed immediately
      performNetworkSwitch(newNetwork);
    }
  };

  const performNetworkSwitch = (newNetwork: Network) => {
    setIsSwitching(true);
    setShowConfirmation(false);
    setPendingNetwork(null);
    clearContractCache();
    setNetwork(newNetwork);
    requestAnimationFrame(() => {
      setTimeout(() => setIsSwitching(false), 300);
    });
  };

  const handleConfirm = () => {
    if (pendingNetwork) {
      performNetworkSwitch(pendingNetwork);
    }
  };

  const handleCancel = () => {
    setShowConfirmation(false);
    setPendingNetwork(null);
  };

  useDialogFocusManagement(showConfirmation, handleCancel, dialogRef);

  const isMainnet = network === NETWORKS.MAINNET;

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
          disabled={isSwitching}
          className="group relative flex items-center gap-2 md:gap-3 px-3 py-2 md:px-4 md:py-3 rounded-xl backdrop-blur-xl border transition-all disabled:opacity-70 disabled:cursor-not-allowed"
          style={{
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            borderColor: isMainnet 
              ? 'rgba(var(--color-theme-primary-rgb), 0.3)' 
              : 'rgba(255, 165, 0, 0.3)',
          }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.98 }}
        >
          {/* Glow effect */}
          <motion.div
            className="absolute -inset-1 rounded-xl blur-lg opacity-0 group-hover:opacity-50 transition-opacity"
            style={{
              backgroundColor: isMainnet 
                ? 'rgba(var(--color-theme-primary-rgb), 0.3)' 
                : 'rgba(255, 165, 0, 0.3)',
            }}
          />

          {/* Network icon or loading spinner */}
          <div className="relative flex items-center justify-center min-w-[1.25rem] min-h-[1.25rem] md:min-w-5 md:min-h-5">
            {isSwitching ? (
              <Loader2
                className="w-4 h-4 md:w-5 md:h-5 animate-spin"
                style={{
                  color: isMainnet ? 'var(--color-theme-primary)' : '#FFA500',
                }}
              />
            ) : (
              <NetworkIcon
                className="w-4 h-4 md:w-5 md:h-5"
                style={{
                  color: isMainnet
                    ? 'var(--color-theme-primary)'
                    : '#FFA500',
                }}
              />
            )}
          </div>

          {/* Network label */}
          <div className="relative flex flex-col items-start">
            <span className="text-[8px] md:text-[10px] font-black tracking-wider text-white/80 uppercase">
              Network
            </span>
            <span
              className="text-xs md:text-sm font-black tracking-tight"
              style={{
                color: isMainnet
                  ? 'var(--color-theme-primary)'
                  : '#FFA500',
              }}
            >
              {isSwitching ? 'Switching…' : getNetworkDisplayName(network)}
            </span>
          </div>

          {/* Status indicator */}
          <motion.div
            className="relative w-2 h-2 rounded-full"
            style={{
              backgroundColor: isMainnet 
                ? 'var(--color-theme-primary)' 
                : '#FFA500',
            }}
            animate={{
              opacity: [0.5, 1, 0.5],
              boxShadow: [
                `0 0 5px ${isMainnet ? 'rgba(var(--color-theme-primary-rgb), 0.5)' : 'rgba(255, 165, 0, 0.5)'}`,
                `0 0 10px ${isMainnet ? 'rgba(var(--color-theme-primary-rgb), 1)' : 'rgba(255, 165, 0, 1)'}`,
                `0 0 5px ${isMainnet ? 'rgba(var(--color-theme-primary-rgb), 0.5)' : 'rgba(255, 165, 0, 0.5)'}`,
              ],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
            }}
          />
        </motion.button>
      </motion.div>

      {/* Network switch confirmation dialog */}
      <AnimatePresence>
        {showConfirmation && pendingNetwork && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="network-switch-title"
            aria-describedby="network-switch-description"
            ref={dialogRef}
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
                  <h2 id="network-switch-title" className="font-bold text-lg text-amber-400">
                    Switch Networks?
                  </h2>
                  <p id="network-switch-description" className="text-sm text-white/70 mt-2">
                    You have an active wrap session. Switching networks will reset your current wrap data and restart indexing on {getNetworkDisplayName(pendingNetwork)}.
                  </p>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleCancel}
                  className="flex-1 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
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

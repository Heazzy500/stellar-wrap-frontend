import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export type TransactionState =
  | "idle"
  | "building"
  | "simulating"
  | "simulated"
  | "signing"
  | "signed"
  | "submitting"
  | "submitted"
  | "confirming"
  | "confirmed"
  | "failed";

interface TransactionStoreState {
  transactionState: TransactionState;
  transactionHash: string | null;
  transactionError: string | null;
  /**
   * The hash of the most recently confirmed transaction.
   * Unlike transactionHash this field is NOT cleared by resetTransaction,
   * so the post-mint success UI and explorer links stay usable even after
   * the user starts a new mint flow.
   */
  confirmedTransactionHash: string | null;
  // actions
  setTransactionState: (state: TransactionState) => void;
  setTransactionHash: (hash: string | null) => void;
  setTransactionError: (error: string | null) => void;
  setConfirmedTransactionHash: (hash: string | null) => void;
  resetTransaction: () => void;
}

export const useTransactionStore = create<TransactionStoreState>()(
  persist(
    (set) => ({
      transactionState: "idle",
      transactionHash: null,
      transactionError: null,
      confirmedTransactionHash: null,
      setTransactionState: (state) => set({ transactionState: state }),
      setTransactionHash: (hash) => set({ transactionHash: hash }),
      setTransactionError: (error) => set({ transactionError: error }),
      setConfirmedTransactionHash: (hash) => set({ confirmedTransactionHash: hash }),
      resetTransaction: () =>
        set({
          transactionState: "idle",
          transactionHash: null,
          transactionError: null,
          // confirmedTransactionHash is intentionally preserved so the
          // post-mint success UI and explorer links remain visible.
        }),
    }),
    {
      name: "stellar-wrap-transaction-storage",
      storage: createJSONStorage(() =>
        typeof window !== "undefined"
          ? localStorage
          : {
              getItem: () => null,
              setItem: () => {},
              removeItem: () => {},
            },
      ),
      // Only keep relevant state, if the transaction was left in an intermediate state we might want to recover.
      // E.g., if it was confirming, we want to resume polling.
    },
  ),
);

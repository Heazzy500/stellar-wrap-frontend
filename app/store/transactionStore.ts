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
  /** Current polling attempt index (1-based) while in the confirming state, null otherwise */
  confirmingAttempt: number | null;
  /** True when confirmation polling exhausted its timeout window */
  confirmingTimedOut: boolean;
  // actions
  setTransactionState: (state: TransactionState) => void;
  setTransactionHash: (hash: string | null) => void;
  setTransactionError: (error: string | null) => void;
  setConfirmingAttempt: (attempt: number | null) => void;
  setConfirmingTimedOut: (timedOut: boolean) => void;
  resetTransaction: () => void;
}

export const useTransactionStore = create<TransactionStoreState>()(
  persist(
    (set) => ({
      transactionState: "idle",
      transactionHash: null,
      transactionError: null,
      confirmingAttempt: null,
      confirmingTimedOut: false,
      setTransactionState: (state) => set({ transactionState: state }),
      setTransactionHash: (hash) => set({ transactionHash: hash }),
      setTransactionError: (error) => set({ transactionError: error }),
      setConfirmingAttempt: (attempt) => set({ confirmingAttempt: attempt }),
      setConfirmingTimedOut: (timedOut) => set({ confirmingTimedOut: timedOut }),
      resetTransaction: () =>
        set({
          transactionState: "idle",
          transactionHash: null,
          transactionError: null,
          confirmingAttempt: null,
          confirmingTimedOut: false,
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

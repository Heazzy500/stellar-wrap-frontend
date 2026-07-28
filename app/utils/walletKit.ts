import { StellarWalletsKit } from "@creit-tech/stellar-wallets-kit/sdk";
import { defaultModules } from "@creit-tech/stellar-wallets-kit/modules/utils";
import { WalletConnectModule } from "@creit-tech/stellar-wallets-kit/modules/wallet-connect";
import { Network } from "../../src/config";
import {
  ContractConfigurationError,
  InvalidContractAddressError,
  ContractNotFoundError,
  ContractValidationError,
} from "./contractErrors";
import { mintWrap as contractMintWrap, type MintWrapOptions, type TransactionObserver } from "../../src/services/contractBridge";
import { useTransactionStore } from "../store/transactionStore";

if (
  typeof process !== "undefined" &&
  !process.env.NEXT_PUBLIC_CONTRACT_ADDRESS_MAINNET &&
  !process.env.NEXT_PUBLIC_CONTRACT_ADDRESS_TESTNET &&
  !process.env.NEXT_PUBLIC_CONTRACT_ADDRESS
) {
  console.warn(
    "⚠️ No contract address env set (NEXT_PUBLIC_CONTRACT_ADDRESS_MAINNET, NEXT_PUBLIC_CONTRACT_ADDRESS_TESTNET, or NEXT_PUBLIC_CONTRACT_ADDRESS). Using placeholder per network.",
  );
}

// Initialize StellarWalletsKit for testnet
let isInitialized = false;

function getStringProperty(data: unknown, key: string): string | null {
  if (data && typeof data === "object" && key in data) {
    const value = (data as Record<string, unknown>)[key];
    return typeof value === "string" ? value : null;
  }
  return null;
}

function getStringField(data: unknown, field: string): string | null {
  if (!data || typeof data !== "object" || !(field in data)) {
    return null;
  }

  const value = (data as Record<string, unknown>)[field];
  return typeof value === "string" ? value : null;
}

export function initWalletKit(): void {
  if (!isInitialized && typeof window !== "undefined") {
    StellarWalletsKit.init({
      modules: [
        ...defaultModules(),
        new WalletConnectModule({
          projectId:
            process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ||
            "stellar-wrapped-2026",
          metadata: {
            name: "Stellar Wrapped",
            description: "Your blockchain story told like never before",
            icons: ["https://stellar.org/favicon.ico"],
            url: window.location.origin,
          },
        }),
      ],
    });
    isInitialized = true;
  }
}

/**
 * Options for minting a wrap NFT
 */
export interface MintWrapParams {
  /** User's Stellar account address */
  userAddress: string;
  /** Network to use (mainnet/testnet) */
  network: Network;
  /** Optional indexed stats to pass as contract arguments */
  stats?: {
    totalVolume: number;
    mostActiveAsset: string;
    contractCalls: number;
    timeframe?: string;
  };
  /** Optional observer callback for transaction state updates */
  observer?: TransactionObserver;
}

/**
 * Fetches indexed stats from the API if not provided
 */
async function fetchIndexedStats(
  accountAddress: string,
  network: Network,
  period: string = "yearly",
): Promise<{ totalVolume: number; mostActiveAsset: string; contractCalls: number }> {
  try {
    const response = await fetch(
      `/api/wrapped?accountId=${encodeURIComponent(accountAddress)}&network=${network}&period=${period}`,
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch indexed stats: ${response.statusText}`);
    }

    const data = await response.json();

    return {
      totalVolume: data.totalVolume || 0,
      mostActiveAsset: data.mostActiveAsset || "XLM",
      contractCalls: data.contractCalls || 0,
    };
  } catch (error) {
    console.warn("Failed to fetch indexed stats, using defaults:", error);
    // Return default values if fetch fails
    return {
      totalVolume: 0,
      mostActiveAsset: "XLM",
      contractCalls: 0,
    };
  }
}

/**
 * Mint the user's Stellar Wrapped as a Soulbound Token NFT
 * 
 * This function handles the complete Soroban contract invocation lifecycle:
 * - Building XDR transactions with contract arguments
 * - Simulating transactions
 * - Signing with Freighter wallet
 * - Submitting to network
 * - Polling for confirmation
 * 
 * @param params - Minting parameters including address, network, and optional stats
 * @returns Transaction hash on success
 * @throws Error if minting fails or user rejects transaction
 * 
 * @example
 * ```ts
 * // With provided stats
 * const txHash = await mintWrap({
 *   userAddress: 'GABC...XYZ',
 *   network: 'testnet',
 *   stats: {
 *     totalVolume: 45000,
 *     mostActiveAsset: 'XLM',
 *     contractCalls: 120,
 *     timeframe: '1y'
 *   }
 * });
 * 
 * // Without stats (will fetch from API)
 * const txHash = await mintWrap({
 *   userAddress: 'GABC...XYZ',
 *   network: 'testnet'
 * });
 * ```
 */
export async function mintWrap(params: MintWrapParams): Promise<string> {
  try {
    initWalletKit();

    const { userAddress, network, stats, observer } = params;

    // Get stats if not provided
    let finalStats = stats;
    if (!finalStats) {
      // Fetch from API if not in store
      finalStats = await fetchIndexedStats(userAddress, network);
    }

    const { setTransactionState, setTransactionHash, setTransactionError, resetTransaction } = useTransactionStore.getState();
    resetTransaction();
    setTransactionState("building");

    const bridgedObserver: TransactionObserver = (state, data) => {
      // Call local observer if passed from component
      if (observer) observer(state, data);

      // Update global UI state
      switch (state) {
        case "pending":
          setTransactionState("building");
          break;
        case "simulating":
          setTransactionState("simulating");
          break;
        case "signed":
          setTransactionState("signing");
          break;
        case "submitted":
          setTransactionState("submitting");
          break;
        case "confirmed":
          setTransactionState("confirmed");
          {
            const transactionHash = getStringProperty(data, "transactionHash");
            if (transactionHash) {
              setTransactionHash(transactionHash);
              useTransactionStore.getState().setConfirmedTransactionHash(transactionHash);
            }
          }
          break;
        case "failed":
          setTransactionState("failed");
          {
            const error = getStringProperty(data, "error");
            if (error) {
              setTransactionError(error);
            }
          }
          break;
      }
    };

    // Build mint options for contract bridge
    const mintOptions: MintWrapOptions = {
      accountAddress: userAddress,
      network,
      stats: {
        totalVolume: finalStats.totalVolume,
        mostActiveAsset: finalStats.mostActiveAsset,
        contractCalls: finalStats.contractCalls,
        timeframe: finalStats.timeframe || "all",
      },
      observer: bridgedObserver,
    };

    // Invoke contract bridge with full transaction lifecycle
    const result = await contractMintWrap(mintOptions);

    useTransactionStore.getState().setTransactionState("confirmed");
    useTransactionStore.getState().setTransactionHash(result.transactionHash);
    useTransactionStore.getState().setConfirmedTransactionHash(result.transactionHash);

    return result.transactionHash;
  } catch (error) {
    if (
      error instanceof ContractConfigurationError ||
      error instanceof InvalidContractAddressError ||
      error instanceof ContractNotFoundError ||
      error instanceof ContractValidationError
    ) {
      throw error;
    }
    if (error instanceof Error) {
      useTransactionStore.getState().setTransactionState("failed");
      useTransactionStore.getState().setTransactionError(error.message);
      throw new Error(`Minting failed: ${error.message}`);
    }
    const genericError = new Error("Minting failed: Unknown error occurred");
    useTransactionStore.getState().setTransactionState("failed");
    useTransactionStore.getState().setTransactionError(genericError.message);
    throw genericError;
  }
}

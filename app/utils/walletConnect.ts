import { isConnected, getAddress, requestAccess, getNetworkDetails } from "@stellar/freighter-api";
import { Network, NETWORK_PASSPHRASES } from "../../src/config";

export const FREIGHTER_INSTALL_URL = "https://www.freighter.app/";

export class FreighterNotInstalledError extends Error {
  readonly installUrl = FREIGHTER_INSTALL_URL;

  constructor() {
    super("Freighter is not installed. Install Freighter, then retry connection.");
    this.name = "FreighterNotInstalledError";
  }
}

interface AlbedoPublicKeyResult {
  publicKey: string;
}

interface Albedo {
  publicKey: (params?: Record<string, unknown>) => Promise<AlbedoPublicKeyResult>;
}

declare global {
  interface Window {
    albedo?: Albedo;
  }
}

/**
 * Thrown by connectFreighter when the wallet's active network does not match
 * the network the app is configured to use.
 */
export class NetworkMismatchError extends Error {
  /** The network the app expects (e.g. "testnet") */
  readonly expected: Network;
  /** The network Freighter is currently on (e.g. "mainnet") */
  readonly actual: string;

  constructor(expected: Network, actual: string) {
    super(
      `Wallet network mismatch: Freighter is on "${actual}" but the app is set to "${expected}". ` +
        `Please switch Freighter to "${expected}" and try again.`,
    );
    this.name = "NetworkMismatchError";
    this.expected = expected;
    this.actual = actual;
  }
}

/**
 * Queries Freighter for the network it is currently connected to and maps it
 * to one of the app's known Network values ("mainnet" | "testnet").
 *
 * Uses the network passphrase as the canonical identifier so the comparison is
 * robust to display-name variations ("STANDALONE", custom labels, etc.).
 *
 * @returns The app-facing network name, or null if Freighter is not installed
 *          or the network cannot be determined.
 */
export const getFreighterNetwork = async (): Promise<Network | null> => {
  try {
    const result = await getNetworkDetails();
    if (result.error || !result.networkPassphrase) {
      return null;
    }
    const passphrase = result.networkPassphrase.trim();
    if (passphrase === NETWORK_PASSPHRASES.mainnet) return "mainnet";
    if (passphrase === NETWORK_PASSPHRASES.testnet) return "testnet";
    // Unknown / custom network — return null so the caller can decide
    return null;
  } catch {
    return null;
  }
};

/**
 * Checks if the Freighter browser extension is available.
 */
export const isFreighterInstalled = async (): Promise<boolean> => {
  if (typeof window === "undefined") {
    return false;
  }

  if ("freighter" in window && window.freighter) {
    return true;
  }

  try {
    const result = await isConnected();
    return !result.error;
  } catch {
    return false;
  }
};

/**
 * Connects to Freighter wallet and returns the user's public key.
 *
 * After obtaining access, the wallet's active network is compared against
 * `network`. If they differ a `NetworkMismatchError` is thrown so the caller
 * can surface a switch-network prompt instead of silently indexing the wrong
 * chain.
 *
 * @param network - The network the app expects (mainnet or testnet)
 * @throws {NetworkMismatchError} If Freighter is on a different network
 * @throws {Error} If wallet is not installed, user rejects connection, or any other error occurs
 */
export const connectFreighter = async (network: Network): Promise<string> => {
  const installed = await isFreighterInstalled();

  if (!installed) {
    throw new FreighterNotInstalledError();
  }

  try {
    const accessResult = await requestAccess();

    if (accessResult.error || !accessResult.address) {
      throw new Error(
        "Connection rejected. Please approve the connection in Freighter.",
      );
    }

    // Validate that Freighter is on the same network the app expects.
    // We do this after requestAccess so we only prompt once.
    const walletNetwork = await getFreighterNetwork();
    if (walletNetwork !== null && walletNetwork !== network) {
      throw new NetworkMismatchError(network, walletNetwork);
    }

    return accessResult.address;
  } catch (error: unknown) {
    if (error instanceof NetworkMismatchError) {
      throw error;
    }
    if (error instanceof Error) {
      if (error.message?.includes("User declined")) {
        throw new Error("Connection rejected by user.");
      }
      throw error;
    }

    throw new Error("Failed to connect to Freighter wallet. Please try again.");
  }
};

/**
 * Gets the currently connected public key without requesting access
 * Returns null if not connected or if Freighter is not installed
 */
export const getCurrentPublicKey = async (): Promise<string | null> => {
  try {
    const installed = await isFreighterInstalled();
    if (!installed) {
      return null;
    }

    const addressResult = await getAddress();
    return addressResult.error ? null : addressResult.address;
  } catch {
    return null;
  }
};

/**
 * Checks if Albedo wallet is available
 */
export const isAlbedoInstalled = (): boolean => {
  return typeof window !== "undefined" && typeof window.albedo !== "undefined";
};

/**
 * Connects to Albedo wallet and returns the user's public key
 * @param _network - The network to connect to (mainnet or testnet)
 * @throws {Error} If Albedo is not available, popup is blocked, or user rejects
 */
export const connectAlbedo = async (_network: Network): Promise<string> => {
  if (!isAlbedoInstalled() || !window.albedo) {
    throw new Error(
      "Albedo wallet not found. Please install the Albedo browser extension.",
    );
  }

  try {
    const result = await window.albedo.publicKey({});
    if (!result?.publicKey) {
      throw new Error(
        "Connection rejected. Please approve the connection in Albedo.",
      );
    }

    return result.publicKey;
  } catch (error: unknown) {
    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      if (message.includes("popup") || message.includes("blocked")) {
        throw new Error(
          "Albedo popup was blocked by your browser. Please allow popups for this site.",
        );
      }
      if (
        message.includes("cancel") ||
        message.includes("declined") ||
        message.includes("rejected")
      ) {
        throw new Error("Connection rejected by user.");
      }
      throw error;
    }
    throw new Error("Failed to connect to Albedo wallet. Please try again.");
  }
};

export const isValidStellarAddress = (address: string): boolean => {
  if (!address || typeof address !== "string") {
    return false;
  }

  const trimmedAddress = address.trim();

  if (!trimmedAddress.startsWith("G") || trimmedAddress.length !== 56) {
    return false;
  }

  const base32Regex = /^[A-Z2-7]{56}$/;
  return base32Regex.test(trimmedAddress);
};

interface XBullPublicKeyResult {
  publicKey?: string;
}

interface XBull {
  getPublicKey(): Promise<XBullPublicKeyResult>;
}

declare global {
  interface Window {
    xBull?: XBull;
  }
}

/**
 * Checks if the xBull browser extension is available
 */
export const isXBullInstalled = (): boolean => {
  return typeof window !== "undefined" && typeof window.xBull !== "undefined";
};

/**
 * Connects to xBull wallet and returns the user's public key
 * @param _network - The network to connect to (mainnet or testnet)
 * @throws {Error} If xBull is not installed, user rejects connection, or any other error occurs
 */
export const connectXBull = async (_network: Network): Promise<string> => {
  if (!isXBullInstalled() || !window.xBull) {
    throw new Error(
      "xBull wallet not found. Please install the xBull browser extension from the Chrome Web Store.",
    );
  }

  try {
    const result = await window.xBull.getPublicKey();

    if (!result?.publicKey) {
      throw new Error(
        "Connection rejected. Please approve the connection in xBull.",
      );
    }

    return result.publicKey;
  } catch (error: unknown) {
    if (error instanceof Error) {
      if (
        error.message?.includes("User rejected") ||
        error.message?.includes("rejected")
      ) {
        throw new Error("Connection rejected by user.");
      }
      throw error;
    }

    throw new Error("Failed to connect to xBull wallet. Please try again.");
  }
};

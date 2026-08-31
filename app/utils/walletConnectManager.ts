import { Network } from "../../src/config";

/**
 * WalletConnect session info stored in store
 */
export interface WalletConnectSession {
  uri?: string;
  pairingTopic?: string;
  sessionTopic?: string;
  publicKey?: string;
  network: Network;
  timestamp: number;
}

/**
 * Connect via WalletConnect and return the user's public key
 * Uses @creit-tech/stellar-wallets-kit for WalletConnect v2
 * @throws {Error} If WalletConnect fails or user rejects connection
 */
export async function connectWalletConnect(network: Network): Promise<string> {
  try {
    if (typeof window === "undefined") {
      throw new Error("WalletConnect is not available on the server");
    }

    const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;
    if (!projectId) {
      throw new Error(
        "WalletConnect project ID not configured. Set NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID."
      );
    }

    const [
      { StellarWalletsKit },
      { WalletConnectModule, WALLET_CONNECT_ID, WalletConnectTargetChain },
      { Networks },
    ] = await Promise.all([
      import("@creit-tech/stellar-wallets-kit/sdk"),
      import("@creit-tech/stellar-wallets-kit/modules/wallet-connect"),
      import("@creit-tech/stellar-wallets-kit/types"),
    ]);

    const kitNetwork =
      network === "mainnet" ? Networks.PUBLIC : Networks.TESTNET;
    const walletConnectChain =
      network === "mainnet"
        ? WalletConnectTargetChain.PUBLIC
        : WalletConnectTargetChain.TESTNET;

    StellarWalletsKit.init({
      modules: [
        new WalletConnectModule({
          projectId,
          metadata: {
            name: "Stellar Wrapped",
            description: "Your blockchain story told like never before",
            icons: ["https://stellar.org/favicon.ico"],
            url: window.location.origin,
          },
          allowedChains: [walletConnectChain],
        }),
      ],
      selectedWalletId: WALLET_CONNECT_ID,
      network: kitNetwork,
      authModal: {
        hideUnsupportedWallets: true,
      },
    });
    StellarWalletsKit.setNetwork(kitNetwork);
    StellarWalletsKit.setWallet(WALLET_CONNECT_ID);

    const { address } = await StellarWalletsKit.authModal();

    if (!address) {
      throw new Error("Failed to get public key from WalletConnect");
    }

    return address;
  } catch (error: unknown) {
    if (error instanceof Error) {
      if (
        error.message?.includes("rejected") ||
        error.message?.includes("cancelled")
      ) {
        throw new Error("Connection rejected by user.");
      }
      throw error;
    }
    throw new Error("Failed to connect via WalletConnect. Please try again.");
  }
}

export async function getQRCodeDataUrl(_uri: string): Promise<string> {
  return "";
}

/**
 * Initialize WalletConnect with QR code
 */
export async function initializeWalletConnectQR(
  network: Network,
  projectId: string
): Promise<{ uri: string; qrCode: string; session: WalletConnectSession }> {
  if (!projectId) {
    throw new Error(
      "WalletConnect project ID not configured. Set NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID."
    );
  }

  // The active WalletConnect modal generates and displays the real QR code.
  const uri = `wc:${Math.random().toString(36).substr(2, 24)}@2?relay-protocol=irn&symKey=${Math.random().toString(36).substr(2, 32)}`;
  const qrCode = await getQRCodeDataUrl(uri);

  const session: WalletConnectSession = {
    uri,
    network,
    timestamp: Date.now(),
  };

  return { uri, qrCode, session };
}

/**
 * Clean up WalletConnect session
 */
export function cleanupWalletConnectSession(
  session: WalletConnectSession
): void {
  // In production, disconnect the session via client.disconnect()
  console.log("WalletConnect session cleaned up:", session.sessionTopic);
}

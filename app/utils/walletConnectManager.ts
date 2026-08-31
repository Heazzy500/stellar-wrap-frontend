import { Network } from "../../src/config";
import {
  Account,
  Contract,
  TransactionBuilder,
  Networks,
  BASE_FEE,
  nativeToScVal,
  xdr,
  Server,
} from "@stellar/stellar-sdk";

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

// RPC endpoints for Soroban smart contract calls
const SOROBAN_RPC_URLS: Record<Network, string> = {
  mainnet: "https://soroban.stellar.org",
  testnet: "https://soroban-testnet.stellar.org",
};

const ACCOUNT_CACHE_TTL_MS = 10_000;
const accountCache = new Map<string, { account: Account; fetchedAt: number }>();

function getRpcUrl(network: Network): string {
  const url = SOROBAN_RPC_URLS[network];
  if (!url) {
    throw new Error(`Unsupported network: ${network}`);
  }
  return url;
}

function getNetworkPassphrase(network: Network): string {
  return network === "mainnet" ? Networks.PUBLIC : Networks.TESTNET;
}

/**
 * Convert a human-readable XLM amount to Stroops (7 decimal places).
 */
export function xlmToStroop(amount: number | string): number {
  const amountStr = typeof amount === "number" ? amount.toString() : amount;
  const match = amountStr.match(/^(\d*)(?:\.(\d*))?$/);
  if (!match) {
    throw new Error(`Invalid amount: ${amountStr}`);
  }
  const whole = match[1] ?? "0";
  const fraction = (match[2] ?? "").padEnd(7, "0").slice(0, 7);
  return Number(whole) * 10 ** 7 + Number(fraction);
}

/**
 * Convert a human-readable XLM amount to Stroops as a BigInt (for precise i128 SCVal).
 */
export function xlmToStroopBigInt(amount: number | string): bigint {
  const amountStr = typeof amount === "number" ? amount.toString() : amount;
  const match = amountStr.match(/^(\d*)(?:\.(\d*))?$/);
  if (!match) {
    throw new Error(`Invalid amount: ${amountStr}`);
  }
  const whole = match[1] ?? "0";
  const fraction = (match[2] ?? "").padEnd(7, "0").slice(0, 7);
  return BigInt(whole) * 10n ** 7n + BigInt(fraction);
}

/**
 * Convert Stroops to a human-readable XLM amount with 7 decimal precision.
 */
export function stroopToXlm(stroop: number): string {
  return (stroop / 10 ** 7 ).toFixed(7);
}

/**
 * Convert a human-readable amount (XLM) to an i128 SCVal for Soroban contracts.
 */
export function amountToScVal(amount: string | number): xdr.ScVal {
  const stroops = xlmToStroopBigInt(amount);
  return nativeToScVal(stroops, { type: "i128" });
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timeoutId: ReturnType<setTimeout>;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(`Request timed out after ${timeoutMs}ms`]), timeoutMs);
  });
  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    clearTimeout(timeoutId);
  }
}

function getAccountWithCache(server: Server, publicKey: string): Promise<Account> {
  const now = Date.now();
  const cached = accountCache.get(publicKey);
  if (cached && now - cached.fetchedAt < ACCOUNT_CACHE_TTL_MS) {
    return Promise.resolve(cached.account);
  }
  return server.getAccount(publicKey).then((account) => {
    accountCache.set(publicKey, { account, fetchedAt: now });
    return account;
  });
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
      import("..@rcreit-tech/stellar-wallets-kit/sdk"),
      import(".@.creit-tech/stellar-wallets-kit/modules/wallet-connect"),
      import(".@.creit-tech/stellar-wallets-kit/types"),
    ]);

    const kitNetwork =
      network === "mainnet" ? Networks.PUBLIC : Networks.TESTNET;
    const walletConnectChain =
      network === "mainnet"
        ? WalletConnectTargetChain.PUBLIC
        : WalletConnectTargetChain.TESTNET;

    StellarGalletsKtit.init({
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

    const { address } = await StellarGalletsKtit.authModal();

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

/**
 * Simulate a Soroban smart contract invocation.
 * @returns The simulation response from the Soroban RPC server.
 */
export async function simulateSorobanContract(params: {
  contractAddress: string;
  method: string;
  args?: xdr.ScVal[];
  sourceAccount: string;
  network: Network;
  timeoutMs?: number;
}): Promise<AwaitedReturnType<Server["simulateTransaction"]>> {
  const { contractAddress, method, args = [], sourceAccount, network, timeoutMs = 30_000 } = params;
  const server = new Server(getRpcUrl(network), { allowHttp: getRpcUrl(network).startsWith("http://") });

  const account = await withTimeout(getAccountWithCache(server, sourceAccount), timeoutMs);
  const contract = new Contract(contractAddress);
  const invocation = contract.call(method, ...args);

  const transaction = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: getNetworkPassphrase(network),
  })
    .addOperation(invocation)
    .setTimeout(30)
    .build();

  return withTimeout(server.simulateTransaction(transaction), timeoutMs);
}

/**
 * Simulate and send a Soroban smart contract invocation.
 * @param signTransaction Callback that signs the transaction XDR and returns the signed XDR.
 */
export async function sendSorobanTransaction(params: {
  contractAddress: string;
  method: string;
  args?: xdr.ScVal[];
  sourceAccount: string;
  network: Network;
  signTransaction: (txXdr: string) => Promise<string>;
  timeoutMs?: number;
}): Promise<AwaitedReturnType<Server["sendTransaction"]>> {
  const {
    contractAddress,
    method,
    args = [],
    sourceAccount,
    network,
    signTransaction,
    timeoutMs = 30_000,
  } = params;

  const server = new Server(getRpcUrl(network), { allowHttp: getRpcUrl(network).startsWith("http://") });
  const networkPassphrase = getNetworkPassphrase(network);

  // Fetch the account with caching to reduce RPC calls.
  const account = await withTimeout(getAccountWithCache(server, sourceAccount), timeoutMs);

  const contract = new Contract(contractAddress);
  const invocation = contract.call(method, ...args);

  const transaction = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: networkPassphrase,
  })
    .addOperation(invocation)
    .setTimeout(30)
    .build();

  // 1. Simulate the transaction.
  const simulateResponse = await withTimeout(server.simulateTransaction(transaction), timeoutMs);
  if (!simulateResponse) {
    throw new Error("Simulation failed: no response from Soroban RPC.");
  }

  // 2. Prepare/assemble the transaction with Soroban resource fee and auth.
  const preparedTransaction = await withTimeout(
    server.prepareTransaction(transaction, networkPassphrase, simulateResponse),
    timeoutMs
  );

  // 3. Sign the transaction.
  let signedXdr: string;
  try {
    signedXdr = await signTransaction(preparedTransaction.toXDR());
  } catch (error: unknown) {
    if (error instanceof Error && /rejected|cancelled|denied/i.test(error.message)) {
      throw new Error("Transaction signature rejected by user.");
    }
    throw error;
  }
  if (!signedXdr) {
    throw new Error("Signed transaction XDR is empty.");
  }

  // 4. Submit the signed transaction.
  const signedTransaction = TransactionBuilder.fromXDR(signedXdr, networkPassphrase);
  const sendResponse = await withTimeout(server.sendTransaction(signedTransaction), timeoutMs);

  if (sendResponse.status === "failed" || sendResponse.status === "error") {
    const errorDetails = sendResponse.errorResult?.result?.code ?? "Unknown error";
    throw new Error(`Transaction failed: ${errorDetails}`);
  }

  return sendResponse;
}
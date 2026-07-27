/**
 * Wallet connection scenarios for the connect flow.
 *
 * Issue #283 — covers the four paths the connect page must handle:
 *   1. missing wallet        — the extension is not installed
 *   2. rejected connection   — the user declines inside the extension
 *   3. network mismatch      — the wallet reports a different network than requested
 *   4. successful connection — a public key is returned
 *
 * `app/[locale]/connect/page.tsx` pushes to `/loading` only inside the success
 * branch of each handler, so every failure case below asserts a rejection —
 * that rejection is what keeps the router from firing. The final describe block
 * mirrors those handlers to assert store state and routing directly.
 */

import type { Network } from "../../../src/config";
import { getAddress, isConnected, requestAccess } from "@stellar/freighter-api";
import {
  connectAlbedo,
  connectFreighter,
  connectXBull,
  getCurrentPublicKey,
  isAlbedoInstalled,
  isFreighterInstalled,
  isValidStellarAddress,
  isXBullInstalled,
} from "../walletConnect";

jest.mock("@stellar/freighter-api", () => ({
  isConnected: jest.fn(),
  getAddress: jest.fn(),
  requestAccess: jest.fn(),
}));

// ─── Mocks and window stubs ─────────────────────────────────────────────────

const asMock = (fn: unknown): jest.Mock => fn as jest.Mock;

const mockIsConnected = asMock(isConnected);
const mockGetAddress = asMock(getAddress);
const mockRequestAccess = asMock(requestAccess);

interface AlbedoStub {
  publicKey: jest.Mock;
}

interface XBullStub {
  getPublicKey: jest.Mock;
}

interface WindowStub {
  freighter?: unknown;
  albedo?: AlbedoStub;
  xBull?: XBullStub;
}

/**
 * The jest environment for this project is `node`, so there is no `window` by
 * default. That is exactly the server-render case the utilities guard against,
 * so tests opt into a browser-ish global explicitly.
 */
const globalRef = globalThis as unknown as { window?: WindowStub };

const stubWindow = (props: WindowStub = {}): WindowStub => {
  globalRef.window = props;
  return props;
};

const removeWindow = (): void => {
  delete globalRef.window;
};

const installFreighter = (): void => {
  stubWindow({ freighter: {} });
};

const uninstallFreighter = (): void => {
  stubWindow();
  mockIsConnected.mockResolvedValue({
    isConnected: false,
    error: "Freighter is not installed",
  });
};

const installAlbedo = (): AlbedoStub => {
  const albedo: AlbedoStub = { publicKey: jest.fn() };
  stubWindow({ albedo });
  return albedo;
};

const installXBull = (): XBullStub => {
  const xBull: XBullStub = { getPublicKey: jest.fn() };
  stubWindow({ xBull });
  return xBull;
};

// ─── Fixtures ───────────────────────────────────────────────────────────────

const VALID_ADDRESS = "GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN7";
const OTHER_ADDRESS = "GCEZWKCA5VLDNRLN3RPRJMRZOX3Z6G5CHCGSNFHEYVXM3XOJMDS674JZ";
const ALL_NETWORKS: Network[] = ["mainnet", "testnet"];

/** The shape a wallet uses to report that it is pointed at the wrong network. */
const NETWORK_MISMATCH_COPY =
  "Network mismatch: wallet is on TESTNET but the app requested PUBLIC";

beforeEach(() => {
  jest.clearAllMocks();
  removeWindow();
});

afterEach(() => {
  removeWindow();
});

// ─── isFreighterInstalled ───────────────────────────────────────────────────

describe("isFreighterInstalled", () => {
  it("returns false during server render, without touching the wallet api", async () => {
    await expect(isFreighterInstalled()).resolves.toBe(false);
    expect(mockIsConnected).not.toHaveBeenCalled();
  });

  it("short-circuits to true when the extension injects window.freighter", async () => {
    installFreighter();

    await expect(isFreighterInstalled()).resolves.toBe(true);
    expect(mockIsConnected).not.toHaveBeenCalled();
  });

  it("falls back to the api and returns true when it reports no error", async () => {
    stubWindow();
    mockIsConnected.mockResolvedValue({ isConnected: true });

    await expect(isFreighterInstalled()).resolves.toBe(true);
    expect(mockIsConnected).toHaveBeenCalledTimes(1);
  });

  it("returns false when the api reports an error", async () => {
    stubWindow();
    mockIsConnected.mockResolvedValue({
      isConnected: false,
      error: "Freighter is not installed",
    });

    await expect(isFreighterInstalled()).resolves.toBe(false);
  });

  it("returns false when the api throws instead of resolving", async () => {
    stubWindow();
    mockIsConnected.mockRejectedValue(new Error("extension bridge unavailable"));

    await expect(isFreighterInstalled()).resolves.toBe(false);
  });
});

// ─── connectFreighter ───────────────────────────────────────────────────────

describe("connectFreighter", () => {
  describe("missing wallet", () => {
    it("throws install guidance and never requests access", async () => {
      uninstallFreighter();

      await expect(connectFreighter("mainnet")).rejects.toThrow(
        "Freighter wallet not found. Please install the Freighter browser extension.",
      );
      expect(mockRequestAccess).not.toHaveBeenCalled();
    });

    it("throws install guidance during server render", async () => {
      await expect(connectFreighter("testnet")).rejects.toThrow(
        "Freighter wallet not found. Please install the Freighter browser extension.",
      );
      expect(mockRequestAccess).not.toHaveBeenCalled();
    });
  });

  describe("rejected connection", () => {
    it("surfaces approval copy when the api resolves with an error field", async () => {
      installFreighter();
      mockRequestAccess.mockResolvedValue({ error: "User declined access" });

      await expect(connectFreighter("mainnet")).rejects.toThrow(
        "Connection rejected. Please approve the connection in Freighter.",
      );
    });

    it("surfaces approval copy when the api resolves without an address", async () => {
      installFreighter();
      mockRequestAccess.mockResolvedValue({ address: "" });

      await expect(connectFreighter("mainnet")).rejects.toThrow(
        "Connection rejected. Please approve the connection in Freighter.",
      );
    });

    it("maps a thrown 'User declined' error to concise user-facing copy", async () => {
      installFreighter();
      mockRequestAccess.mockRejectedValue(
        new Error("User declined access to their account"),
      );

      await expect(connectFreighter("mainnet")).rejects.toThrow(
        "Connection rejected by user.",
      );
    });

    it("falls back to generic copy when a non-Error value is thrown", async () => {
      installFreighter();
      mockRequestAccess.mockRejectedValue("popup closed");

      await expect(connectFreighter("mainnet")).rejects.toThrow(
        "Failed to connect to Freighter wallet. Please try again.",
      );
    });
  });

  describe("network mismatch", () => {
    it("propagates the wallet's network error verbatim so the page can display it", async () => {
      installFreighter();
      mockRequestAccess.mockRejectedValue(new Error(NETWORK_MISMATCH_COPY));

      await expect(connectFreighter("mainnet")).rejects.toThrow(
        NETWORK_MISMATCH_COPY,
      );
    });

    it("does not swallow the mismatch into the generic rejection message", async () => {
      installFreighter();
      mockRequestAccess.mockRejectedValue(new Error(NETWORK_MISMATCH_COPY));

      await expect(connectFreighter("testnet")).rejects.not.toThrow(
        "Connection rejected by user.",
      );
    });
  });

  describe("successful connection", () => {
    it("resolves with the address returned by the wallet", async () => {
      installFreighter();
      mockRequestAccess.mockResolvedValue({ address: VALID_ADDRESS });

      await expect(connectFreighter("mainnet")).resolves.toBe(VALID_ADDRESS);
      expect(mockRequestAccess).toHaveBeenCalledTimes(1);
    });

    it.each(ALL_NETWORKS)("resolves on %s", async (network) => {
      installFreighter();
      mockRequestAccess.mockResolvedValue({ address: VALID_ADDRESS });

      await expect(connectFreighter(network)).resolves.toBe(VALID_ADDRESS);
    });

    it("returns an address that passes the app's own address validation", async () => {
      installFreighter();
      mockRequestAccess.mockResolvedValue({ address: VALID_ADDRESS });

      const address = await connectFreighter("mainnet");
      expect(isValidStellarAddress(address)).toBe(true);
    });
  });
});

// ─── getCurrentPublicKey ────────────────────────────────────────────────────

describe("getCurrentPublicKey", () => {
  it("returns null when the wallet is missing and never asks for an address", async () => {
    uninstallFreighter();

    await expect(getCurrentPublicKey()).resolves.toBeNull();
    expect(mockGetAddress).not.toHaveBeenCalled();
  });

  it("returns null when the api reports an error", async () => {
    installFreighter();
    mockGetAddress.mockResolvedValue({ error: "no account selected" });

    await expect(getCurrentPublicKey()).resolves.toBeNull();
  });

  it("returns null when the api throws", async () => {
    installFreighter();
    mockGetAddress.mockRejectedValue(new Error("bridge closed"));

    await expect(getCurrentPublicKey()).resolves.toBeNull();
  });

  it("returns the address when the wallet is already connected", async () => {
    installFreighter();
    mockGetAddress.mockResolvedValue({ address: VALID_ADDRESS });

    await expect(getCurrentPublicKey()).resolves.toBe(VALID_ADDRESS);
  });

  it("never requests access, so it cannot trigger an approval prompt", async () => {
    installFreighter();
    mockGetAddress.mockResolvedValue({ address: VALID_ADDRESS });

    await getCurrentPublicKey();
    expect(mockRequestAccess).not.toHaveBeenCalled();
  });
});

// ─── Albedo ─────────────────────────────────────────────────────────────────

describe("isAlbedoInstalled", () => {
  it("returns false during server render", () => {
    expect(isAlbedoInstalled()).toBe(false);
  });

  it("returns false when the extension has not injected itself", () => {
    stubWindow();
    expect(isAlbedoInstalled()).toBe(false);
  });

  it("returns true once window.albedo exists", () => {
    installAlbedo();
    expect(isAlbedoInstalled()).toBe(true);
  });
});

describe("connectAlbedo", () => {
  it("throws install guidance when the extension is missing", async () => {
    stubWindow();

    await expect(connectAlbedo("mainnet")).rejects.toThrow(
      "Albedo wallet not found. Please install the Albedo browser extension.",
    );
  });

  it("throws install guidance during server render", async () => {
    await expect(connectAlbedo("mainnet")).rejects.toThrow(
      "Albedo wallet not found. Please install the Albedo browser extension.",
    );
  });

  it("reports a rejection when the user declines in the extension", async () => {
    const albedo = installAlbedo();
    albedo.publicKey.mockRejectedValue(new Error("User rejected the request"));

    // Matches either the mapped copy or the wallet's own wording; both read as
    // a rejection to the user.
    await expect(connectAlbedo("mainnet")).rejects.toThrow(/reject/i);
  });

  it("falls back to generic copy when a non-Error value is thrown", async () => {
    const albedo = installAlbedo();
    albedo.publicKey.mockRejectedValue("popup blocked");

    await expect(connectAlbedo("mainnet")).rejects.toThrow(
      "Failed to connect to Albedo wallet. Please try again.",
    );
  });

  it("propagates a network mismatch error verbatim", async () => {
    const albedo = installAlbedo();
    albedo.publicKey.mockRejectedValue(new Error(NETWORK_MISMATCH_COPY));

    await expect(connectAlbedo("testnet")).rejects.toThrow(
      NETWORK_MISMATCH_COPY,
    );
  });

  it("resolves with the public key on success", async () => {
    const albedo = installAlbedo();
    albedo.publicKey.mockResolvedValue({ publicKey: VALID_ADDRESS });

    await expect(connectAlbedo("mainnet")).resolves.toBe(VALID_ADDRESS);
  });
});

// ─── xBull ──────────────────────────────────────────────────────────────────

describe("isXBullInstalled", () => {
  it("returns false during server render", () => {
    expect(isXBullInstalled()).toBe(false);
  });

  it("returns false when the extension has not injected itself", () => {
    stubWindow();
    expect(isXBullInstalled()).toBe(false);
  });

  it("returns true once window.xBull exists", () => {
    installXBull();
    expect(isXBullInstalled()).toBe(true);
  });
});

describe("connectXBull", () => {
  describe("missing wallet", () => {
    it("throws install guidance pointing at the Chrome Web Store", async () => {
      stubWindow();

      await expect(connectXBull("mainnet")).rejects.toThrow(
        "xBull wallet not found. Please install the xBull browser extension from the Chrome Web Store.",
      );
    });

    it("throws install guidance during server render", async () => {
      await expect(connectXBull("mainnet")).rejects.toThrow(
        "xBull wallet not found. Please install the xBull browser extension from the Chrome Web Store.",
      );
    });
  });

  describe("rejected connection", () => {
    it("surfaces approval copy when the wallet returns no public key", async () => {
      const xBull = installXBull();
      xBull.getPublicKey.mockResolvedValue({});

      await expect(connectXBull("mainnet")).rejects.toThrow(
        "Connection rejected. Please approve the connection in xBull.",
      );
    });

    it("maps a thrown 'User rejected' error to concise copy", async () => {
      const xBull = installXBull();
      xBull.getPublicKey.mockRejectedValue(
        new Error("User rejected the connection request"),
      );

      await expect(connectXBull("mainnet")).rejects.toThrow(
        "Connection rejected by user.",
      );
    });

    it("maps any 'rejected' wording to concise copy", async () => {
      const xBull = installXBull();
      xBull.getPublicKey.mockRejectedValue(new Error("request was rejected"));

      await expect(connectXBull("mainnet")).rejects.toThrow(
        "Connection rejected by user.",
      );
    });

    it("falls back to generic copy when a non-Error value is thrown", async () => {
      const xBull = installXBull();
      xBull.getPublicKey.mockRejectedValue({ code: -4 });

      await expect(connectXBull("mainnet")).rejects.toThrow(
        "Failed to connect to xBull wallet. Please try again.",
      );
    });
  });

  describe("network mismatch", () => {
    it("propagates the wallet's network error verbatim", async () => {
      const xBull = installXBull();
      xBull.getPublicKey.mockRejectedValue(new Error(NETWORK_MISMATCH_COPY));

      await expect(connectXBull("mainnet")).rejects.toThrow(
        NETWORK_MISMATCH_COPY,
      );
    });

    it("does not misclassify a mismatch as a user rejection", async () => {
      const xBull = installXBull();
      xBull.getPublicKey.mockRejectedValue(new Error(NETWORK_MISMATCH_COPY));

      await expect(connectXBull("testnet")).rejects.not.toThrow(
        "Connection rejected by user.",
      );
    });
  });

  describe("successful connection", () => {
    it("resolves with the public key", async () => {
      const xBull = installXBull();
      xBull.getPublicKey.mockResolvedValue({ publicKey: VALID_ADDRESS });

      await expect(connectXBull("mainnet")).resolves.toBe(VALID_ADDRESS);
    });

    it.each(ALL_NETWORKS)("resolves on %s", async (network) => {
      const xBull = installXBull();
      xBull.getPublicKey.mockResolvedValue({ publicKey: OTHER_ADDRESS });

      await expect(connectXBull(network)).resolves.toBe(OTHER_ADDRESS);
    });
  });
});

// ─── isValidStellarAddress ──────────────────────────────────────────────────

describe("isValidStellarAddress", () => {
  it("accepts a well-formed Ed25519 public key", () => {
    expect(isValidStellarAddress(VALID_ADDRESS)).toBe(true);
  });

  it("tolerates surrounding whitespace", () => {
    expect(isValidStellarAddress(`  ${VALID_ADDRESS}  `)).toBe(true);
  });

  it.each([
    ["an empty string", ""],
    ["a wrong prefix", VALID_ADDRESS.replace(/^G/, "S")],
    ["a truncated address", VALID_ADDRESS.slice(0, 55)],
    ["an overlong address", `${VALID_ADDRESS}A`],
    ["lowercase characters", VALID_ADDRESS.toLowerCase()],
    ["non-base32 digits", `G${"0".repeat(55)}`],
    ["the placeholder demo address", "GDEMOADDRESSFORSTELLARWRAPDEMOPURPOSES12345678"],
  ])("rejects %s", (_label, address) => {
    expect(isValidStellarAddress(address)).toBe(false);
  });

  it("rejects non-string input", () => {
    expect(isValidStellarAddress(undefined as unknown as string)).toBe(false);
    expect(isValidStellarAddress(null as unknown as string)).toBe(false);
    expect(isValidStellarAddress(123 as unknown as string)).toBe(false);
  });
});

// ─── Connect flow contract ──────────────────────────────────────────────────

/**
 * Mirrors the shape of the handlers in `app/[locale]/connect/page.tsx`:
 * store writes on success, error copy plus `status: "error"` on failure, and
 * `router.push("/loading")` reached only from the success branch.
 */
interface FlowOutcome {
  address: string | null;
  storeError: string | null;
  status: "loading" | "error";
  pushedTo: string | null;
}

const runConnectFlow = async (
  connect: (network: Network) => Promise<string>,
  network: Network,
): Promise<FlowOutcome> => {
  const outcome: FlowOutcome = {
    address: null,
    storeError: null,
    status: "loading",
    pushedTo: null,
  };

  try {
    const publicKey = await connect(network);
    outcome.address = publicKey;
    outcome.storeError = null;
    outcome.pushedTo = "/loading";
  } catch (error: unknown) {
    outcome.storeError =
      error instanceof Error ? error.message : "Failed to connect wallet";
    outcome.status = "error";
  }

  return outcome;
};

describe("connect flow contract", () => {
  it("does not route when the wallet is missing", async () => {
    stubWindow();

    const outcome = await runConnectFlow(connectXBull, "mainnet");

    expect(outcome.pushedTo).toBeNull();
    expect(outcome.address).toBeNull();
    expect(outcome.status).toBe("error");
    expect(outcome.storeError).toBe(
      "xBull wallet not found. Please install the xBull browser extension from the Chrome Web Store.",
    );
  });

  it("does not route when the user rejects the connection", async () => {
    const xBull = installXBull();
    xBull.getPublicKey.mockRejectedValue(new Error("User rejected"));

    const outcome = await runConnectFlow(connectXBull, "mainnet");

    expect(outcome.pushedTo).toBeNull();
    expect(outcome.address).toBeNull();
    expect(outcome.status).toBe("error");
    expect(outcome.storeError).toBe("Connection rejected by user.");
  });

  it("does not route on a network mismatch, and shows the wallet's message", async () => {
    installFreighter();
    mockRequestAccess.mockRejectedValue(new Error(NETWORK_MISMATCH_COPY));

    const outcome = await runConnectFlow(connectFreighter, "mainnet");

    expect(outcome.pushedTo).toBeNull();
    expect(outcome.status).toBe("error");
    expect(outcome.storeError).toBe(NETWORK_MISMATCH_COPY);
  });

  it("routes to /loading and stores the address only on success", async () => {
    installFreighter();
    mockRequestAccess.mockResolvedValue({ address: VALID_ADDRESS });

    const outcome = await runConnectFlow(connectFreighter, "mainnet");

    expect(outcome.pushedTo).toBe("/loading");
    expect(outcome.address).toBe(VALID_ADDRESS);
    expect(outcome.storeError).toBeNull();
    expect(outcome.status).toBe("loading");
  });

  it("clears no error and routes for every supported network", async () => {
    for (const network of ALL_NETWORKS) {
      installFreighter();
      mockRequestAccess.mockResolvedValue({ address: VALID_ADDRESS });

      const outcome = await runConnectFlow(connectFreighter, network);

      expect(outcome.pushedTo).toBe("/loading");
      expect(outcome.storeError).toBeNull();
    }
  });
});

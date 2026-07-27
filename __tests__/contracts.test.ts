/**
 * Unit tests for network-aware contract configuration.
 * Run with: npm test
 */

import {
  isValidContractAddress,
  getContractAddress,
  getContractConfigForAllNetworks,
} from "../config/contracts";
import { NETWORKS, type Network } from "../src/config";

const VALID_CONTRACT_ID =
  "CA3D5KRYM6CB7OWQ6TWYRR3Z4T7GNZLKERYNZGGA5SOAOPIFY6YQGAXE";

function withEnv(
  vars: Record<string, string | undefined>,
  fn: () => void,
) {
  const prev: Record<string, string | undefined> = {};
  for (const key of Object.keys(vars)) {
    prev[key] = process.env[key];
  }
  try {
    for (const [key, val] of Object.entries(vars)) {
      if (val === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = val;
      }
    }
    fn();
  } finally {
    for (const [key, val] of Object.entries(prev)) {
      if (val === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = val;
      }
    }
  }
}

describe("isValidContractAddress", () => {
  it("accepts valid 56-char C-prefix base32 address", () => {
    expect(isValidContractAddress(VALID_CONTRACT_ID)).toBe(true);
  });

  it("accepts placeholder address", () => {
    expect(isValidContractAddress("C" + "A".repeat(55))).toBe(true);
  });

  it("rejects non-C prefix", () => {
    expect(
      isValidContractAddress(
        "G" + "A".repeat(55)
      )
    ).toBe(false);
  });

  it("rejects wrong length", () => {
    expect(isValidContractAddress("C" + "A".repeat(54))).toBe(false);
    expect(isValidContractAddress("C" + "A".repeat(56))).toBe(false);
  });

  it("rejects invalid base32 characters", () => {
    expect(
      isValidContractAddress("C" + "1".repeat(55))
    ).toBe(false);
  });
});

describe("getContractConfigForAllNetworks", () => {
  it("returns config for mainnet and testnet", () => {
    const config = getContractConfigForAllNetworks();
    expect(config).toHaveProperty("mainnet");
    expect(config).toHaveProperty("testnet");
    expect(config.mainnet).toHaveProperty("contractAddress");
    expect(config.testnet).toHaveProperty("contractAddress");
  });

  it("returns valid contract address format for both networks", () => {
    const config = getContractConfigForAllNetworks();
    expect(isValidContractAddress(config.mainnet.contractAddress)).toBe(true);
    expect(isValidContractAddress(config.testnet.contractAddress)).toBe(true);
  });

  it("uses network-specific env var over placeholder for mainnet", () => {
    withEnv(
      {
        NEXT_PUBLIC_CONTRACT_ADDRESS_MAINNET: VALID_CONTRACT_ID,
        NEXT_PUBLIC_CONTRACT_ADDRESS_TESTNET: undefined,
      },
      () => {
        const config = getContractConfigForAllNetworks();
        expect(config.mainnet.contractAddress).toBe(VALID_CONTRACT_ID);
        expect(config.testnet.contractAddress).toBe("C" + "A".repeat(55));
      },
    );
  });

  it("uses network-specific env var for testnet", () => {
    withEnv(
      {
        NEXT_PUBLIC_CONTRACT_ADDRESS_MAINNET: undefined,
        NEXT_PUBLIC_CONTRACT_ADDRESS_TESTNET: VALID_CONTRACT_ID,
      },
      () => {
        const config = getContractConfigForAllNetworks();
        expect(config.testnet.contractAddress).toBe(VALID_CONTRACT_ID);
      },
    );
  });

  it("falls back to legacy env var when per-network vars are not set", () => {
    withEnv(
      {
        NEXT_PUBLIC_CONTRACT_ADDRESS_MAINNET: undefined,
        NEXT_PUBLIC_CONTRACT_ADDRESS_TESTNET: undefined,
        NEXT_PUBLIC_CONTRACT_ADDRESS: VALID_CONTRACT_ID,
      },
      () => {
        const config = getContractConfigForAllNetworks();
        expect(config.mainnet.contractAddress).toBe(VALID_CONTRACT_ID);
        expect(config.testnet.contractAddress).toBe(VALID_CONTRACT_ID);
      },
    );
  });

  it("prefers per-network env var over legacy env var", () => {
    withEnv(
      {
        NEXT_PUBLIC_CONTRACT_ADDRESS_MAINNET: VALID_CONTRACT_ID,
        NEXT_PUBLIC_CONTRACT_ADDRESS_TESTNET: undefined,
        NEXT_PUBLIC_CONTRACT_ADDRESS: "C" + "B".repeat(55),
      },
      () => {
        const config = getContractConfigForAllNetworks();
        expect(config.mainnet.contractAddress).toBe(VALID_CONTRACT_ID);
      },
    );
  });
});

describe("getContractAddress", () => {
  it("loads address for mainnet and testnet", () => {
    const mainnetAddr = getContractAddress(NETWORKS.MAINNET);
    const testnetAddr = getContractAddress(NETWORKS.TESTNET);
    expect(mainnetAddr).toBeTruthy();
    expect(testnetAddr).toBeTruthy();
    expect(isValidContractAddress(mainnetAddr)).toBe(true);
    expect(isValidContractAddress(testnetAddr)).toBe(true);
  });

  it("throws on invalid network", () => {
    expect(() => getContractAddress("invalid" as Network)).toThrow();
  });

  it("throws when env var contains an invalid contract address", () => {
    withEnv(
      {
        NEXT_PUBLIC_CONTRACT_ADDRESS_MAINNET: "not-a-valid-address",
      },
      () => {
        expect(() => getContractAddress(NETWORKS.MAINNET)).toThrow(
          "Invalid contract address for mainnet",
        );
      },
    );
  });

  it("throws when legacy env var contains an invalid contract address", () => {
    withEnv(
      {
        NEXT_PUBLIC_CONTRACT_ADDRESS_MAINNET: undefined,
        NEXT_PUBLIC_CONTRACT_ADDRESS_TESTNET: undefined,
        NEXT_PUBLIC_CONTRACT_ADDRESS: "bad-address",
      },
      () => {
        expect(() => getContractAddress(NETWORKS.MAINNET)).toThrow(
          "Invalid contract address for mainnet",
        );
        expect(() => getContractAddress(NETWORKS.TESTNET)).toThrow(
          "Invalid contract address for testnet",
        );
      },
    );
  });
});

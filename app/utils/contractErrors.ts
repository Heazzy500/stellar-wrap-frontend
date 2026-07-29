/**
 * Errors for network-aware contract loading and validation.
 */

export class ContractConfigurationError extends Error {
  constructor(
    message: string,
    public readonly network?: string,
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = "ContractConfigurationError";
    Object.setPrototypeOf(this, ContractConfigurationError.prototype);
  }
}

export class InvalidContractAddressError extends ContractConfigurationError {
  constructor(address: string, network?: string) {
    super(
      `Invalid contract address${network ? ` for ${network}` : ""}: must be 56 characters, C-prefix, base32.`,
      network
    );
    this.name = "InvalidContractAddressError";
  }
}

/**
 * Thrown when the configured address is the CAAAAA… placeholder.
 * Includes a user-safe message and a developer configuration hint.
 */
export class PlaceholderContractError extends ContractConfigurationError {
  readonly userMessage: string;
  readonly developerHint: string;

  constructor(network: string) {
    const envVar = `NEXT_PUBLIC_CONTRACT_ADDRESS_${network.toUpperCase()}`;
    const userMessage =
      "This network is not ready for minting yet. Contract configuration is missing.";
    const developerHint = `Set ${envVar} (or NEXT_PUBLIC_CONTRACT_ADDRESS) to a real Soroban contract ID. Placeholder CAAAAA… addresses are rejected before wallet signing.`;
    super(`${userMessage} ${developerHint}`, network);
    this.name = "PlaceholderContractError";
    this.userMessage = userMessage;
    this.developerHint = developerHint;
  }
}

export class ContractNotFoundError extends ContractConfigurationError {
  constructor(network: string, cause?: unknown) {
    super(`Contract not found on ${network}.`, network, cause);
    this.name = "ContractNotFoundError";
  }
}

export class ContractValidationError extends ContractConfigurationError {
  constructor(
    message: string,
    network?: string,
    cause?: unknown
  ) {
    super(message, network, cause);
    this.name = "ContractValidationError";
  }
}

export class NetworkMismatchError extends ContractConfigurationError {
  constructor(expected: string, actual: string) {
    super(`Network mismatch: expected ${expected}, got ${actual}.`);
    this.name = "NetworkMismatchError";
  }
}

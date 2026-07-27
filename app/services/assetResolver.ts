/**
 * Asset Resolution Service
 * Resolves asset codes and issuers to human-readable display names and metadata
 */

import { AssetMetadata } from "@/app/types/asset";
import {
  KNOWN_ASSETS,
  NATIVE_ASSET,
  DEFAULT_ASSET_LOGO,
  parseAssetCode,
  createAssetCacheKey,
} from "@/app/utils/assetConstants";
import { assetCache } from "@/app/services/assetCacheService";

// Note: Type definition kept for future use with Horizon API responses
// eslint-disable-next-line @typescript-eslint/no-unused-vars
interface HorizonAsset {
  asset_code: string;
  asset_issuer: string;
  num_accounts: number;
}

class AssetResolver {
  private isResolving = new Set<string>();

  /**
   * Resolve asset code and issuer to metadata
   * Checks cache first, then known assets, then attempts to fetch metadata
   */
  async resolveAsset(code: string, issuer?: string): Promise<AssetMetadata> {
    // Normalize native asset
    if (!code || code === "native" || code.toUpperCase() === "XLM") {
      return NATIVE_ASSET;
    }

    const normalizedCode = code.toUpperCase();

    // Check cache first
    const cached = assetCache.get(normalizedCode, issuer);
    if (cached) {
      return cached;
    }

    // Check known assets
    if (KNOWN_ASSETS[normalizedCode]) {
      const known = KNOWN_ASSETS[normalizedCode];
      // Only return if issuer matches or it's a native asset
      if (known.isNative || !issuer || known.issuer === issuer) {
        assetCache.set(known);
        return known;
      }
    }

    // Return fallback immediately if we're already resolving this
    const cacheKey = createAssetCacheKey(normalizedCode, issuer);
    if (this.isResolving.has(cacheKey)) {
      return this.createFallbackMetadata(normalizedCode, issuer);
    }

    // Attempt to fetch metadata from external sources
    this.isResolving.add(cacheKey);
    try {
      const metadata = await this.fetchAssetMetadata(normalizedCode, issuer);
      assetCache.set(metadata);
      return metadata;
    } catch (error) {
      console.warn(`Failed to resolve asset ${normalizedCode}:`, error);
      return this.createFallbackMetadata(normalizedCode, issuer);
    } finally {
      this.isResolving.delete(cacheKey);
    }
  }

  /**
   * Resolve multiple assets
   */
  async resolveAssets(
    assets: Array<{ code: string; issuer?: string }>,
  ): Promise<AssetMetadata[]> {
    return Promise.all(
      assets.map((asset) => this.resolveAsset(asset.code, asset.issuer)),
    );
  }

  /**
   * Resolve asset from string format (e.g., "USDC" or "USDC:ISSUER")
   */
  async resolveAssetFromString(assetString: string): Promise<AssetMetadata> {
    const { code, issuer } = parseAssetCode(assetString);
    return this.resolveAsset(code, issuer);
  }

  /**
   * Fetch asset metadata from external APIs
   * Tries multiple sources with fallbacks
   */
  private async fetchAssetMetadata(
    code: string,
    issuer?: string,
  ): Promise<AssetMetadata> {
    // Skip API call if no issuer (only native assets have no issuer)
    if (!issuer) {
      return this.createFallbackMetadata(code);
    }

    try {
      // Try Stellar Expert API first
      const metadata = await this.fetchFromStellarExpert(code, issuer);
      if (metadata) return metadata;
    } catch {
      console.debug("Stellar Expert API failed, trying Horizon...");
    }

    try {
      // Try Horizon API
      const metadata = await this.fetchFromHorizon(code, issuer);
      if (metadata) return metadata;
    } catch {
      console.debug("Horizon API failed for asset metadata");
    }

    // Return fallback if all API calls fail
    return this.createFallbackMetadata(code, issuer);
  }

  /**
   * Fetch asset metadata from Stellar Expert
   */
  private async fetchFromStellarExpert(
    code: string,
    issuer: string,
  ): Promise<AssetMetadata | null> {
    try {
      const response = await fetch(
        `https://api.stellar.expert/explorer/public/asset/${code}-${issuer}`,
        { signal: AbortSignal.timeout(5000) },
      );

      if (!response.ok) return null;

      const data = await response.json();

      return {
        code,
        issuer,
        name: data.name || code,
        isNative: false,
        logo: data.image || data.logo,
        domain: data.domain,
        description: data.description,
      };
    } catch {
      return null;
    }
  }

  /**
   * Fetch asset metadata from Horizon
   */
  private async fetchFromHorizon(
    code: string,
    issuer: string,
  ): Promise<AssetMetadata | null> {
    try {
      const response = await fetch(
        `https://horizon.stellar.org/assets?asset_code=${code}&asset_issuer=${issuer}&limit=1`,
        { signal: AbortSignal.timeout(5000) },
      );

      if (!response.ok) return null;

      const data = await response.json();
      const asset = data._embedded?.records?.[0];

      if (asset) {
        return {
          code: asset.asset_code,
          issuer: asset.asset_issuer,
          name: asset.asset_code,
          isNative: false,
          logo: undefined,
        };
      }

      return null;
    } catch {
      return null;
    }
  }

  /**
   * Create fallback metadata when resolution fails
   */
  private createFallbackMetadata(code: string, issuer?: string): AssetMetadata {
    return {
      code: code.toUpperCase(),
      issuer,
      name: code.toUpperCase(),
      isNative: false,
      logo: DEFAULT_ASSET_LOGO,
      description: `Asset ${code}`,
    };
  }

  /**
   * Get display name for an asset
   */
  getDisplayName(metadata: AssetMetadata): string {
    if (metadata.isNative) {
      return `${metadata.name} (${metadata.code})`;
    }

    // For issued assets, include the code
    return `${metadata.name} (${metadata.code})`;
  }

  /**
   * Get short display name for an asset (code only)
   */
  getShortDisplayName(metadata: AssetMetadata): string {
    return metadata.code;
  }

  /**
   * Check if asset is native
   */
  isNativeAsset(code: string): boolean {
    return !code || code === "native" || code.toUpperCase() === "XLM";
  }

  /**
   * Clear asset cache
   */
  clearCache(): void {
    assetCache.clear();
  }
}

// Singleton instance
export const assetResolver = new AssetResolver();

/**
 * Convenience function to resolve a single asset
 */
export async function resolveAsset(
  code: string,
  issuer?: string,
): Promise<AssetMetadata> {
  return assetResolver.resolveAsset(code, issuer);
}

/**
 * Convenience function to resolve multiple assets
 */
export async function resolveAssets(
  assets: Array<{ code: string; issuer?: string }>,
): Promise<AssetMetadata[]> {
  return assetResolver.resolveAssets(assets);
}

/**
 * Get display name for asset metadata
 */
export function getAssetDisplayName(metadata: AssetMetadata): string {
  return assetResolver.getDisplayName(metadata);
}

/**
 * Get short display name for asset metadata
 */
export function getAssetShortName(metadata: AssetMetadata): string {
  return assetResolver.getShortDisplayName(metadata);
}

/**
 * Check if code represents native asset
 */
export function isNativeAsset(code: string): boolean {
  return assetResolver.isNativeAsset(code);
}

// ---------------------------------------------------------------------------
// dApp icon / fallback visuals (deterministic initials for unknown contracts)
// ---------------------------------------------------------------------------

const STELLAR_CONTRACT_PATTERN = /^[GCM][A-Z2-7]{55}$/;

/** Known dApp labels mapped to their indexer emoji icons — unchanged when present. */
export const KNOWN_DAPP_ICONS: Record<string, string> = {
  "Stellar Expert": "📊",
  StellarX: "📈",
  Aqua: "💧",
  LOBSTR: "🦞",
  Soroban: "⚡",
  DEX: "🔄",
  "Liquidity Pool": "💧",
  Bridge: "🌉",
  Payments: "💳",
};

export type DappVisual =
  | { type: "logo"; logoUrl: string }
  | { type: "emoji"; emoji: string }
  | { type: "initials"; initials: string; backgroundColor: string };

function hashDappKey(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function buildDappInitials(name: string): string {
  const trimmed = name.trim();
  if (STELLAR_CONTRACT_PATTERN.test(trimmed)) {
    return trimmed.slice(0, 2).toUpperCase();
  }
  const words = trimmed.split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    return `${words[0][0] ?? ""}${words[1][0] ?? ""}`.toUpperCase();
  }
  const alnum = trimmed.replace(/[^a-zA-Z0-9]/g, "");
  return (alnum.slice(0, 2) || "??").toUpperCase();
}

function initialsBackground(name: string): string {
  const hue = hashDappKey(name.trim().toLowerCase()) % 360;
  return `hsl(${hue} 52% 32%)`;
}

/**
 * Resolve how a dApp should be rendered: logo URL, known emoji, or initials fallback.
 */
export function resolveDappVisual(
  name: string,
  options?: { icon?: string; logo?: string },
): DappVisual {
  const trimmed = name.trim();
  if (options?.logo) {
    return { type: "logo", logoUrl: options.logo };
  }
  if (options?.icon) {
    return { type: "emoji", emoji: options.icon };
  }
  const known =
    KNOWN_DAPP_ICONS[trimmed] ??
    KNOWN_DAPP_ICONS[
      Object.keys(KNOWN_DAPP_ICONS).find(
        (key) => key.toLowerCase() === trimmed.toLowerCase(),
      ) ?? ""
    ];
  if (known) {
    return { type: "emoji", emoji: known };
  }
  return {
    type: "initials",
    initials: buildDappInitials(trimmed),
    backgroundColor: initialsBackground(trimmed),
  };
}

/**
 * Asset type definitions for Stellar wrap
 */

/**
 * Represents resolved asset metadata
 */
export interface AssetMetadata {
  code: string;
  issuer?: string;
  name: string;
  /** URL to the asset logo image. */
  logo?: string;
  /** Alternative text for the logo image, used for accessibility (e.g., screen readers). */
  logoAlt?: string;
  domain?: string;
  description?: string;
  isNative: boolean;
}

/**
 * Asset cache entry with expiration
 */
export interface AssetCacheEntry {
  metadata: AssetMetadata;
  timestamp: number;
  ttl: number; // in milliseconds
  /** Bumped when issuer metadata schema changes; mismatched entries are dropped. */
  version: number;
}

/**
 * Asset cache store
 */
export interface AssetCache {
  [key: string]: AssetCacheEntry;
}

/**
 * Stellar asset without metadata
 */
export interface RawAsset {
  code: string;
  issuer?: string;
}

/**
 * Result of asset resolution
 */
export interface AssetResolutionResult {
  success: boolean;
  metadata?: AssetMetadata;
  error?: string;
}

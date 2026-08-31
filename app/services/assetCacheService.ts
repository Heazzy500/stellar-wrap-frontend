/**
 * Asset metadata caching service
 *
 * Policy:
 * - In-memory cache is authoritative for the current session.
 * - Entries expire after `ASSET_CACHE_TTL` (24h) based on `timestamp`.
 * - `ASSET_CACHE_VERSION` invalidates persisted entries after resolver changes.
 * - Call `invalidateExpired()` or `assetResolver.refreshAsset()` to force a refresh.
 */

import { AssetCache, AssetMetadata, AssetCacheEntry } from "@/app/types/asset";
import {
  ASSET_CACHE_TTL,
  ASSET_CACHE_VERSION,
  createAssetCacheKey,
} from "@/app/utils/assetConstants";

class AssetCacheService {
  private memoryCache: AssetCache = {};
  private readonly STORAGE_KEY = "stellar-asset-cache";
  private readonly MAX_CACHE_SIZE = 1000;

  constructor() {
    this.initializeFromStorage();
  }

  /**
   * Initialize cache from browser storage
   */
  private initializeFromStorage(): void {
    if (typeof window === "undefined") return;

    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        this.memoryCache = this.filterValidEntries(parsed);
      }
    } catch (error) {
      console.error("Failed to initialize asset cache from storage:", error);
      // Continue with empty cache
    }
  }

  private isEntryValid(entry: AssetCacheEntry): boolean {
    const now = Date.now();
    if (entry.version !== ASSET_CACHE_VERSION) {
      return false;
    }
    return now - entry.timestamp < entry.ttl;
  }

  /**
   * Filter out expired cache entries
   */
  private filterValidEntries(cache: AssetCache): AssetCache {
    const valid: AssetCache = {};

    Object.entries(cache).forEach(([key, entry]) => {
      if (this.isEntryValid(entry)) {
        valid[key] = entry;
      }
    });

    return valid;
  }

  /**
   * Get asset metadata from cache
   */
  get(code: string, issuer?: string): AssetMetadata | null {
    const key = createAssetCacheKey(code, issuer);
    const entry = this.memoryCache[key];

    if (!entry) return null;

    if (!this.isEntryValid(entry)) {
      delete this.memoryCache[key];
      this.persistToStorage();
      return null;
    }

    return entry.metadata;
  }

  /**
   * Returns true when a cache entry exists but is past TTL or version.
   */
  isStale(code: string, issuer?: string): boolean {
    const key = createAssetCacheKey(code, issuer);
    const entry = this.memoryCache[key];
    if (!entry) return false;
    return !this.isEntryValid(entry);
  }

  /**
   * Set asset metadata in cache
   */
  set(metadata: AssetMetadata, ttl: number = ASSET_CACHE_TTL): void {
    const key = createAssetCacheKey(metadata.code, metadata.issuer);

    this.memoryCache[key] = {
      metadata,
      timestamp: Date.now(),
      ttl,
      version: ASSET_CACHE_VERSION,
    };

    // Persist to storage
    this.persistToStorage();
  }

  /**
   * Persist cache to browser storage with size limits
   */
  private persistToStorage(): void {
    if (typeof window === "undefined" || !localStorage) return;

    try {
      // Clean up oldest entries if cache is too large
      if (Object.keys(this.memoryCache).length > this.MAX_CACHE_SIZE) {
        this.pruneOldest();
      }

      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.memoryCache));
    } catch (error) {
      console.error("Failed to persist asset cache to storage:", error);
      // Continue even if storage fails
    }
  }

  /**
   * Remove oldest entries when cache exceeds max size
   */
  private pruneOldest(): void {
    const entries = Object.entries(this.memoryCache);
    const sorted = entries.sort(([, a], [, b]) => a.timestamp - b.timestamp);

    // Keep only 80% of max size after pruning
    const keepCount = Math.floor(this.MAX_CACHE_SIZE * 0.8);
    const toKeep = sorted.slice(-keepCount);

    this.memoryCache = Object.fromEntries(toKeep);
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.memoryCache = {};
    if (typeof window !== "undefined") {
      localStorage.removeItem(this.STORAGE_KEY);
    }
  }

  /**
   * Clear specific asset from cache
   */
  clearAsset(code: string, issuer?: string): void {
    const key = createAssetCacheKey(code, issuer);
    delete this.memoryCache[key];
    this.persistToStorage();
  }

  /**
   * Remove expired or version-mismatched entries from memory and storage.
   */
  invalidateExpired(): number {
    let removed = 0;
    Object.entries(this.memoryCache).forEach(([key, entry]) => {
      if (!this.isEntryValid(entry)) {
        delete this.memoryCache[key];
        removed += 1;
      }
    });
    if (removed > 0) {
      this.persistToStorage();
    }
    return removed;
  }

  /**
   * Reload from localStorage and drop invalid entries (manual refresh).
   */
  refreshFromStorage(): void {
    this.memoryCache = {};
    this.initializeFromStorage();
    this.invalidateExpired();
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    size: number;
    entries: number;
  } {
    return {
      size: Object.keys(this.memoryCache).length,
      entries: Object.keys(this.memoryCache).length,
    };
  }
}

// Singleton instance
export const assetCache = new AssetCacheService();

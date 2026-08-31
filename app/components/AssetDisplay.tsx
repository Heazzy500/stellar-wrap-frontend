"use client";

/**
 * AssetDisplay Component
 * Displays resolved asset with logo, name, and code.
 *
 * Fix #280 — stable icon dimensions + polished fallback:
 *  - Icon slot is always rendered at the configured dimensions so the layout
 *    never shifts regardless of load/error state.
 *  - When the <Image> fails to load, an in-place initials badge replaces it
 *    while keeping the same reserved size.
 *  - AssetCard applies the same treatment to its own image.
 */

import React, { useEffect, useState } from "react";
import { AssetMetadata } from "@/app/types/asset";
import {
  resolveAsset,
  getAssetDisplayName,
  getAssetShortName,
} from "@/app/services/assetResolver";
import Image from "next/image";

const ASSET_METADATA_CACHE_KEY = "asset-display-metadata-cache-v1";

const ASSET_LIST_CACHE_KEY = "asset-list-state-v1";

export interface CachedAssetRef {
  code: string;
  issuer?: string;
}

function assetCacheKey(code: string, issuer?: string): string {
  return issuer ? `${code}:${issuer}` : `${code}:native`;
}

function loadAssetMetadataCache(): Record<string, AssetMetadata> {
  if (typeof window === "undefined") {
    return {};
  }

  try {
    const raw = window.localStorage.getItem(ASSET_METADATA_CACHE_KEY);
    if (!raw) {
      return {};
    }

    const parsed: unknown = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, AssetMetadata>;
    }

    return {};
  } catch {
    return {};
  }
}

function cacheAssetMetadata(
  code: string,
  issuer: string | undefined,
  metadata: AssetMetadata,
): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    const cache = loadAssetMetadataCache();
    cache[assetCacheKey(code, issuer)] = metadata;
    window.localStorage.setItem(
      ASSET_METADATA_CACHE_KEY,
      JSON.stringify(cache),
    );
    cacheAssetInList(code, issuer);
  } catch {
    // Silently ignore storage failures (private mode, quota exceeded).
  }
}

export function loadAssetListState(): CachedAssetRef[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(ASSET_LIST_CACHE_KEY);
    if (!raw) {
      return Object.keys(loadAssetMetadataCache()).map((key) => {
        const separatorIndex = key.lastIndexOf(":");
        if (separatorIndex === -1) {
          return { code: key };
        }

        const code = key.slice(0, separatorIndex);
        const issuer = key.slice(separatorIndex + 1);
        return issuer === "native" ? { code } : { code, issuer };
      });
    }

    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as CachedAssetRef[]) : [];
  } catch {
    return [];
  }
}

export function saveAssetListState(assets: CachedAssetRef[]): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(ASSET_LIST_CACHE_KEY, JSON.stringify(assets));
  } catch {
    // Silently ignore storage failures (private mode, quota exceeded).
  }
}

/**
 * Hook that persists the asset list state to localStorage across sessions.
 */
export function useAssetListState() {
  const [assets, setAssets] = useState<CachedAssetRef[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setAssets(loadAssetListState());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) {
      saveAssetListState(assets);
    }
  }, [assets, hydrated]);

  return [assets, setAssets] as const;
}

function cacheAssetInList(code: string, issuer?: string): void {
  const list = loadAssetListState();
  const key = assetCacheKey(code, issuer);
  const exists = list.some(
    (entry) => assetCacheKey(entry.code, entry.issuer) === key,
  );

  if (!exists) {
    list.push(issuer === undefined ? { code } : { code, issuer });
  }
  saveAssetListState(list);
}

interface AssetDisplayProps {
  code: string;
  issuer?: string;
  showLogo?: boolean;
  showCode?: boolean;
  showFullName?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
  logoClassName?: string;
}

/**
 * Size configurations for different display sizes
 */
const SIZE_CONFIGS = {
  sm: { logo: 16, text: "text-xs" },
  md: { logo: 24, text: "text-sm" },
  lg: { logo: 32, text: "text-base" },
};

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

/** Produce a 1- or 2-letter abbreviation for a given asset code. */
function assetInitials(code: string): string {
  const clean = code.replace(/[^a-zA-Z0-9]/g, "");
  return (clean.slice(0, 2) || "??").toUpperCase();
}

/**
 * Deterministic background colour derived from the asset code so the same
 * asset always gets the same colour, which looks intentional rather than
 * random.
 */
function initialsColor(code: string): string {
  let hash = 0;
  for (let i = 0; i < code.length; i++) {
    hash = (hash * 31 + code.charCodeAt(i)) >>> 0;
  }
  const hue = hash % 360;
  return `hsl(${hue} 52% 32%)`;
}

interface InitialsBadgeProps {
  code: string;
  size: number;
  className?: string;
}

/**
 * A compact, always-visible initials badge that occupies exactly the same
 * dimensions as the <Image> it replaces, so the layout never shifts.
 */
const InitialsBadge: React.FC<InitialsBadgeProps> = ({
  code,
  size,
  className = "",
}) => (
  <span
    aria-label={`${code} icon`}
    className={`inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white ${className}`}
    style={{
      width: size,
      height: size,
      fontSize: Math.max(8, Math.floor(size * 0.4)),
      backgroundColor: initialsColor(code),
    }}
  >
    {assetInitials(code)}
  </span>
);

// ---------------------------------------------------------------------------
// AssetIconSlot — always reserves fixed dimensions; shows image or fallback
// ---------------------------------------------------------------------------

interface AssetIconSlotProps {
  logo: string | undefined;
  code: string;
  size: number;
  className?: string;
}

/**
 * Renders the icon at a fixed size regardless of load/error state.
 *
 * States:
 *  1. logo present & loads OK   → <Image>
 *  2. logo present & fails      → <InitialsBadge> (same dimensions)
 *  3. no logo                   → <InitialsBadge> immediately
 */
const AssetIconSlot: React.FC<AssetIconSlotProps> = ({
  logo,
  code,
  size,
  className = "",
}) => {
  const [imgError, setImgError] = useState(false);

  // If the logo URL changes, reset the error flag
  useEffect(() => {
    setImgError(false);
  }, [logo]);

  if (!logo || imgError) {
    return <InitialsBadge code={code} size={size} className={className} />;
  }

  return (
    <Image
      src={logo}
      alt={code}
      width={size}
      height={size}
      className={`rounded-full ${className}`}
      onError={() => setImgError(true)}
      // Prevent the image from collapsing its container before it loads
      style={{ minWidth: size, minHeight: size }}
    />
  );
};

// ---------------------------------------------------------------------------
// AssetDisplay
// ---------------------------------------------------------------------------

/**
 * AssetDisplay component
 * Resolves and displays asset metadata with logo and name.
 */
export const AssetDisplay: React.FC<AssetDisplayProps> = ({
  code,
  issuer,
  showLogo = true,
  showCode = true,
  showFullName = true,
  size = "md",
  className = "",
  logoClassName = "",
}) => {
  const [metadata, setMetadata] = useState<AssetMetadata | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const sizeConfig = SIZE_CONFIGS[size];

  useEffect(() => {
    let mounted = true;

    const cached = loadAssetMetadataCache()[assetCacheKey(code, issuer)];

    setError(null);
    if (cached) {
      setMetadata(cached);
      setLoading(false);
      cacheAssetInList(code, issuer);
      return;
    }

    setMetadata(null);
    setLoading(true);

    const fetchAsset = async () => {
      try {
        const resolved = await resolveAsset(code, issuer);
        if (mounted) {
          setMetadata(resolved);
          cacheAssetMetadata(code, issuer, resolved);
        }
      } catch (err) {
        if (mounted && !cached) {
          setError(
            err instanceof Error ? err.message : "Failed to resolve asset",
          );
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    fetchAsset();

    return () => {
      mounted = false;
    };
  }, [code, issuer]);

  // Loading state — icon slot is a pulse skeleton at the reserved dimensions
  if (loading) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        {showLogo && (
          <div
            aria-hidden="true"
            className="shrink-0 animate-pulse rounded-full bg-gray-200 dark:bg-gray-700"
            style={{
              width: sizeConfig.logo,
              height: sizeConfig.logo,
            }}
          />
        )}
        {showCode && (
          <span className={`${sizeConfig.text} text-gray-400`}>Loading...</span>
        )}
      </div>
    );
  }

  // Error / unresolved state — still reserve the icon slot to prevent shift
  if (error || !metadata) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        {showLogo && (
          <InitialsBadge
            code={code}
            size={sizeConfig.logo}
            className={logoClassName}
          />
        )}
        {showCode && (
          <span
            className={`${sizeConfig.text} text-gray-600 dark:text-gray-400`}
          >
            {code}
          </span>
        )}
      </div>
    );
  }

  const displayName = showFullName
    ? getAssetDisplayName(metadata)
    : getAssetShortName(metadata);

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {showLogo && (
        <AssetIconSlot
          logo={metadata.logo}
          code={metadata.code}
          size={sizeConfig.logo}
          className={logoClassName}
        />
      )}
      <span
        className={`${sizeConfig.text} font-medium text-gray-900 dark:text-gray-100`}
      >
        {displayName}
      </span>
    </div>
  );
};

// ---------------------------------------------------------------------------
// AssetBadge
// ---------------------------------------------------------------------------

/**
 * Compact asset display (code only with optional logo)
 */
export const AssetBadge: React.FC<Omit<AssetDisplayProps, "showFullName">> = (
  props,
) => {
  return (
    <AssetDisplay {...props} showFullName={false} size={props.size || "sm"} />
  );
};

// ---------------------------------------------------------------------------
// AssetCard
// ---------------------------------------------------------------------------

/**
 * Asset display with full metadata and a stable icon slot.
 */
export const AssetCard: React.FC<
  AssetDisplayProps & { showIssuer?: boolean }
> = ({ showIssuer = false, ...props }) => {
  const [metadata, setMetadata] = useState<AssetMetadata | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const cached =
      loadAssetMetadataCache()[assetCacheKey(props.code, props.issuer)];

    if (cached) {
      setMetadata(cached);
      setLoading(false);
      cacheAssetInList(props.code, props.issuer);
      return;
    }

    setMetadata(null);
    setLoading(true);

    const fetchAsset = async () => {
      try {
        const resolved = await resolveAsset(props.code, props.issuer);
        if (mounted) {
          setMetadata(resolved);
          cacheAssetMetadata(props.code, props.issuer, resolved);
        }
      } catch {
        // Keep cached metadata if available; fallback handles unresolved assets.
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    fetchAsset();

    return () => {
      mounted = false;
    };
  }, [props.code, props.issuer]);

  if (loading) {
    return (
      <div className="flex items-center gap-3 rounded-lg bg-gray-100 p-3 dark:bg-gray-800">
        {/* Icon skeleton — fixed 32×32 so the layout doesn't shift */}
        <div
          aria-hidden="true"
          className="h-8 w-8 shrink-0 animate-pulse rounded-full bg-gray-300 dark:bg-gray-600"
        />
        <div className="space-y-1">
          <div className="h-4 w-24 animate-pulse rounded bg-gray-300 dark:bg-gray-600" />
          <div className="h-3 w-16 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
        </div>
      </div>
    );
  }

  if (!metadata) {
    return (
      <div className="flex items-center gap-3 rounded-lg bg-gray-100 p-3 dark:bg-gray-800">
        {/* Reserve the icon slot even for the fallback state */}
        <InitialsBadge code={props.code} size={32} />
        <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
          {props.code}
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 rounded-lg bg-gray-100 p-3 dark:bg-gray-800">
      {props.showLogo && (
        <AssetIconSlot logo={metadata.logo} code={metadata.code} size={32} />
      )}
      <div className="flex-1">
        <div className="font-medium text-gray-900 dark:text-gray-100">
          {metadata.name}
        </div>
        <div className="text-xs text-gray-600 dark:text-gray-400">
          {metadata.code}
          {showIssuer && metadata.issuer && (
            <span className="ml-2">({metadata.issuer.slice(0, 8)}...)</span>
          )}
        </div>
        {metadata.description && (
          <div className="mt-1 text-xs text-gray-500 dark:text-gray-500">
            {metadata.description}
          </div>
        )}
      </div>
    </div>
  );
};

export default AssetDisplay;

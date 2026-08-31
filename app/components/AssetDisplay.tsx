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
const INITIALS_BG_CLASSES: string[] = [
  "bg-red-800",
  "bg-orange-800",
  "bg-amber-800",
  "bg-green-800",
  "bg-teal-800",
  "bg-blue-800",
  "bg-indigo-800",
  "bg-purple-800",
  "bg-pink-800",
  "bg-gray-800",
];

function initialsColor(code: string): string {
  let hash = 0;
  for (let i = 0; i < code.length; i++) {
    hash = (hash * 31 + code.charCodeAt(i)) >>> 0;
  }
  return INITIALS_BG_CLASSES[hash % INITIALS_BG_CLASSES.length] ?? "bg-gray-800";
}

/** Fixed Tailwind size classes for the three supported icon slot sizes. */
function iconSizeClass(size: number): string {
  if (size === 16) {
    return "h-4 w-4";
  }
  if (size === 24) {
    return "h-6 w-6";
  }
  return "h-8 w-8";
}

/** Fixed Tailwind font-size class for initials inside an icon slot. */
function initialsSizeClass(size: number): string {
  if (size === 16) {
    return "text-[8px]";
  }
  if (size === 24) {
    return "text-[9px]";
  }
  return "text-[12px]";
}

interface InitialsBadgeProps {
  code: string;
  size: number;
  className?: string;
  decorative?: boolean;
}

/**
 * A compact, always-visible initials badge that occupies exactly the same
 * dimensions as the <Image> it replaces, so the layout never shifts.
 */
const InitialsBadge: React.FC<InitialsBadgeProps> = ({
  code,
  size,
  className = "",
  decorative = false,
}) => (
  <span
    role={decorative ? undefined : "img"}
    aria-label={decorative ? undefined : `${code} icon`}
    aria-hidden={decorative || undefined}
    className={`inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white ${iconSizeClass(size)} ${initialsSizeClass(size)} ${initialsColor(code)} ${className}`}
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
  alt?: string;
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
  alt,
}) => {
  const [imgError, setImgError] = useState(false);

  // If the logo URL changes, reset the error flag
  useEffect(() => {
    setImgError(false);
  }, [logo]);

  if (!logo || imgError) {
    return (
      <InitialsBadge
        code={code}
        size={size}
        className={className}
        decorative={alt === ""}
      />
    );
  }

  return (
    <Image
      src={logo}
      alt={alt ?? code}
      width={size}
      height={size}
      className={`shrink-0 rounded-full ${iconSizeClass(size)} ${className}`}
      onError={() => setImgError(true)}
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

    const fetchAsset = async () => {
      try {
        setLoading(true);
        setError(null);
        const resolved = await resolveAsset(code, issuer);
        if (mounted) {
          setMetadata(resolved);
        }
      } catch (err) {
        if (mounted) {
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
      <div role="status" className={`flex items-center gap-2 ${className}`}>
        {showLogo && (
          <div
            aria-hidden="true"
            className={`shrink-0 animate-pulse rounded-full bg-gray-200 dark:bg-gray-700 ${iconSizeClass(sizeConfig.logo)}`}
          />
        )}
        {showCode && (
          <span className={`${sizeConfig.text} text-gray-600 dark:text-gray-400`}>Loading...</span>
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
            decorative={showCode}
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
  const logoAlt = displayName
    .toLowerCase()
    .includes(metadata.code.toLowerCase())
    ? ""
    : metadata.code;

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {showLogo && (
        <AssetIconSlot
          logo={metadata.logo}
          code={metadata.code}
          size={sizeConfig.logo}
          className={logoClassName}
          alt={logoAlt}
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

    const fetchAsset = async () => {
      try {
        setLoading(true);
        const resolved = await resolveAsset(props.code, props.issuer);
        if (mounted) {
          setMetadata(resolved);
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
  }, [props.code, props.issuer]);

  if (loading) {
    return (
      <div role="status" className="flex items-center gap-3 rounded-lg bg-gray-100 p-3 dark:bg-gray-800">
        <span className="sr-only">Loading asset</span>
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
        <InitialsBadge code={props.code} size={32} decorative />
        <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
          {props.code}
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 rounded-lg bg-gray-100 p-3 dark:bg-gray-800">
      {props.showLogo && (
        <AssetIconSlot logo={metadata.logo} code={metadata.code} size={32} alt="" />
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
          <div className="mt-1 text-xs text-gray-600 dark:text-gray-400">
            {metadata.description}
          </div>
        )}
      </div>
    </div>
  );
};

export default AssetDisplay;

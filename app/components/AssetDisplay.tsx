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
import type { Meta, StoryObj } from "@storybook/react";

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

export type AssetCardVariant = "primary" | "secondary" | "disabled" | "loading";

const CARD_VARIANTS: Record<AssetCardVariant, string> = {
  primary: "bg-gray-100 dark:bg-gray-800",
  secondary:
    "bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700",
  disabled: "bg-gray-100 dark:bg-gray-800",
  loading: "bg-gray-100 dark:bg-gray-800",
};

const CARD_INTERACTION_CLASSES =
  "cursor-pointer transition-shadow hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 active:shadow-sm";

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
export interface AssetCardProps extends AssetDisplayProps {
  showIssuer?: boolean;
  variant?: AssetCardVariant;
  disabled?: boolean;
  loading?: boolean;
  onClick?: () => void;
}

export const AssetCard: React.FC<AssetCardProps> = ({
  showIssuer = false,
  showLogo = true,
  variant = "primary",
  disabled = false,
  loading: loadingProp = false,
  onClick,
  className = "",
  ...props
}) => {
  const [metadata, setMetadata] = useState<AssetMetadata | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const fetchAsset = async () => {
      try {
        setIsLoading(true);
        const resolved = await resolveAsset(props.code, props.issuer);
        if (mounted) {
          setMetadata(resolved);
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    fetchAsset();

    return () => {
      mounted = false;
    };
  }, [props.code, props.issuer]);

  const isDisabledVariant = variant === "disabled";
  const isLoadingVariant = variant === "loading";
  const resolvedDisabled = disabled || isDisabledVariant;
  const resolvedLoading = loadingProp || isLoadingVariant;
  const isLoadingOrProp = isLoading || resolvedLoading;
  const cardClassName = `flex w-full items-center gap-3 rounded-lg p-3 text-left ${CARD_VARIANTS[variant]} ${className} ${
    onClick && !resolvedDisabled && !isLoadingOrProp ? CARD_INTERACTION_CLASSES : ""
  } ${resolvedDisabled ? "cursor-not-allowed opacity-60" : ""}`;

  const cardContent = (children: React.ReactNode) => {
    const interactive = Boolean(onClick) && !isLoadingOrProp;

    return (
      <div
        className={cardClassName}
        role={interactive ? "button" : isLoadingOrProp ? "status" : undefined}
        tabIndex={interactive && !resolvedDisabled ? 0 : undefined}
        aria-disabled={interactive && resolvedDisabled ? true : undefined}
        aria-busy={isLoadingOrProp ? true : undefined}
        aria-label={isLoadingOrProp ? "Loading asset" : undefined}
        onClick={interactive && !resolvedDisabled ? onClick : undefined}
        onKeyDown={
          interactive && !resolvedDisabled
            ? (event: React.KeyboardEvent<HTMLDivElement>) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onClick?.();
                }
              }
            : undefined
        }
      >
        {children}
      </div>
    );
  };

  if (isLoadingOrProp) {
    return cardContent(
      <>
        {/* Icon skeleton — fixed 32×32 so the layout doesn't shift */}
        {showLogo && (
          <div
            aria-hidden="true"
            className="h-8 w-8 shrink-0 animate-pulse rounded-full bg-gray-300 dark:bg-gray-600"
          />
        )}
        <div className="space-y-1">
          <div className="h-4 w-24 animate-pulse rounded bg-gray-300 dark:bg-gray-600" />
          <div className="h-3 w-16 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
        </div>
      </>,
    );
  }

  if (!metadata) {
    return cardContent(
      <>
        {/* Reserve the icon slot even for the fallback state */}
        {showLogo && (
          <InitialsBadge code={props.code} size={32} />
        )}
        <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
          {props.code}
        </span>
      </>,
    );
  }

  return cardContent(
    <>
      {showLogo && (
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
    </>,
  );
};

const meta = {
  title: "Components/AssetCard",
  component: AssetCard,
  parameters: {
    layout: "centered",
    viewport: {
      viewports: {
        mobile: { name: "Mobile", styles: { width: "375px", height: "667px" } },
        tablet: { name: "Tablet", styles: { width: "768px", height: "1024px" } },
        desktop: { name: "Desktop", styles: { width: "1280px", height: "800px" } },
      },
    },
  },
  decorators: [
    (Story) => (
      <div className="max-w-sm">
        <Story />
      </div>
    ),
  ],
  argTypes: {
    variant: {
      control: { type: "select" },
      options: ["primary", "secondary", "disabled", "loading"],
    },
    showIssuer: { control: "boolean" },
    disabled: { control: "boolean" },
    loading: { control: "boolean" },
  },
} satisfies Meta<typeof AssetCard>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Primary: Story = {
  args: {
    code: "USD",
    issuer: "GA5X",
    variant: "primary",
    showIssuer: true,
  },
};

export const Mobile: Story = {
  args: {
    ...Primary.args,
  },
  parameters: {
    viewport: {
      defaultViewport: "mobile",
    },
  },
};

export const Tablet: Story = {
  args: {
    ...Primary.args,
  },
  parameters: {
    viewport: {
      defaultViewport: "tablet",
    },
  },
};

export const Desktop: Story = {
  args: {
    ...Primary.args,
  },
  parameters: {
    viewport: {
      defaultViewport: "desktop",
    },
  },
};

export const DarkMode: Story = {
  args: {
    ...Primary.args,
  },
  decorators: [
    (Story) => (
      <div className="dark">
        <Story />
      </div>
    ),
  ],
};

export const Secondary: Story = {
  args: {
    code: "EUR",
    issuer: "GBY",
    variant: "secondary",
    showIssuer: true,
  },
};

export const Disabled: Story = {
  args: {
    code: "BTC",
    issuer: "GABC",
    variant: "disabled",
    disabled: true,
    onClick: () => undefined,
  },
};

export const Loading: Story = {
  args: {
    code: "XRP",
    issuer: "GXYZ",
    variant: "loading",
    loading: true,
  },
};

export const Interactive: Story = {
  args: {
    code: "ETH",
    issuer: "GETH",
    variant: "primary",
    onClick: () => undefined,
  },
};

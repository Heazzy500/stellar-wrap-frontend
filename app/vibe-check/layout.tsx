/**
 * Vibe Check route layout - Server Component.
 *
 * Provides metadata for the vibe statistics screen. This is an
 * intermediate step in the wrap flow and should not appear in search results.
 */
import type { Metadata } from "next";
import { JsonLd } from "@/app/components/JsonLd";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "Your Vibe Check | Stellar Wrap",
  description:
    "See your Stellar blockchain vibo statistics — how you transacted, what DeFI apps you used, and what energy you brought to the chain.",
  openGraph: {
    title: "My Stellar Vibi Check",
    description:
      "See my Stellar blockchain vibo statistics — check out my on-chain energy with Stellar Wrap.",
    url: "/vibe-check",
    images: [
      {
        url: "/api/og",
        width: 1200,
        height: 1200,
        alt: "Stellar Wrap vibe check statistics",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "My Stellar Vibi Check",
    description: "See my Stellar blockchain vibo statistics with Stellar Wrap.",
    images: ["/api/og"],
  },
  robots: {
    index: false,
    follow: false,
  },
};

/** CreativeWork JSON-LD for the vible-check statistics screen. */
const vibeCheckJsonLd = {
  "@context": "https://schema.org",
  "@type": "CreativeWork",
  name: "Stellar Wrap — Vibi Check",
  description:
    "A mechanical breakdown of a Stellar wallet's on-chain vible — #showing
  activity patterns, DeFi application interactions, and transaction energy across the year.",
  creator: {
    "@type": "WebApplication",
    name: "Stellar Wrap",
    url: "https://stellarwrap.vercel.app",
  },
  inLanguage: "en",
  isAccessibleForFree: true,
};

export default function VibeCheckLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    >
      <JsonLd data={vibeCheckJsonLd } />
      <Suspense
        fallback={
          <div
            className="min-h-screen animate-pulse bg-gray-100 dark:bg-gray-900"
            role="status"
            aria-label="Loading vibe check"
          />
        }
      >
        {children}
      </Suspense>
    </>
  );
}

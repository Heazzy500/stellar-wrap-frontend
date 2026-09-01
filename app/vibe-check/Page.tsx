
"use client";

import React, { lazy, Suspense } from "react";
import { useRouter } from "next/navigation";
import { ProgressIndicator } from "@/app/components/ProgressIndicator";
import { ShareButtons } from "@/app/components/ShareButtons";
import { MuteToggle } from "@/app/components/MuteToggle";
import { useWrapStore } from "@/app/store/wrapStore";
import { motion } from "framer-motion";

const Screen4VibeCheck = lazy(() =>
  import("@/app/components/Screen4VibeCheck").then((m) => ({
    default: m.Screen4VibeCheck,
  })),
);

export default function VibeCheckPage() {
  const router = useRouter();
  const { result, period } = useWrapStore();
  const vibes = result?.vibes ?? [];
  const dapps = result?.dapps ?? [];
  const dexTradingSummary = result?.dexTradingSummary;
  const sorobanBuilderSummary = result?.sorobanBuilderSummary;
  const portfolioDiversitySummary = result?.portfolioDiversitySummary;
  const biggestDaySummary = result?.biggestDaySummary;
  const nftActivitySummary = result?.nftActivitySummary;

  return (
    <div className="relative w-full h-screen">
      <Suspense
        fallback={
          <div className="flex items-center justify-center w-full h-screen bg-black">
            <span className="sr-only">Loading vibe check…</span>
            <div
              className="w-10 h-10 rounded-full border-4 border-white/20 border-t-white animate-spin"
              aria-hidden="true"
            />
          </div>
        }
      >
        <Screen4VibeCheck
          vibes={vibes}
          dapps={dapps}
          dexTradingSummary={dexTradingSummary}
          sorobanBuilderSummary={sorobanBuilderSummary}
          portfolioDiversitySummary={portfolioDiversitySummary}
          biggestDaySummary={biggestDaySummary}
          nftActivitySummary={nftActivitySummary}
        />
      </Suspense>

      <ProgressIndicator
        currentStep={4}
        totalSteps={6}
        onNext={() => router.push("/persona")}
        showNext={true}
      />


      <motion.div
        className="absolute top-6 right-6 md:top-8 md:right-8 z-30"
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.2 }}
      >
        <MuteToggle />
      </motion.div>

      <ShareButtons
        title="My Vibe Check - Stellar Wrapped 2026"
        text={
          vibes.length
            ? `My Stellar vibe: ${vibes[0].percentage}% ${vibes[0].label}! What's yours? 🎨 #StellarWrapped #DeFi`
            : "Check out my Stellar Vibe Check! 🎨 #StellarWrapped #DeFi"
        }
        hashtags={["StellarWrapped", "DeFi", "CryptoVibe"]}
        persona={result?.persona}
        topStat={
          vibes.length
            ? `${vibes[0].percentage}% ${vibes[0].label}`
            : undefined
        }
      />
    </div>
  );
}

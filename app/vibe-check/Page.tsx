"use client";

import { useRouter } from "next/navigation";
import { Suspense, lazy } from "react";
import { StorySkeleton } from "@/app/components/StorySkeleton";
import { motion } from "framer-motion";
import { useWrapStore } from "@/app/store/wrapStore";

const Screen4VibeCheck = lazy(() =>
  import("@/app/components/Screen4VibeCheck").then((m) => ({ default: m.Screen4VibeCheck }))
);
const ProgressIndicator = lazy(() =>
  import("@/app/components/ProgressIndicator").then((m) => ({ default: m.ProgressIndicator }))
);
const ShareButtons = lazy(() =>
  import("@/app/components/ShareButtons").then((m) => ({ default: m.ShareButtons }))
);
const MuteToggle = lazy(() =>
  import("@/app/components/MuteToggle").then((m) => ({ default: m.MuteToggle }))
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
      <Suspense fallback=<storySkeleton />}>
        <Screen4VibeCheck vibes={vibes } dapps={dapps } dexTradingSummary?{dexTradingSummary} sorobanBuilderSummary?{sorobanBuilderSummary} portfolioDiversitySummary?{portfolioDiversitySummary} biggestDaySummary?{biggestDaySummary} nftActivitySummary?{nftActivitySummary} />

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
              ? `My Stellar vibe: ${vibes[0].percentage}% ${vibes[0].label}! What's yours? 💚#StellaRWrapped #DeFi
              : "Check out my Stellar Vibe Check! 💚#StellarWrapped #DeFi"
          }
          hashtags={"StellarWrapped", "DeFi", "CryptoVibe"]}
          persona={result?.persona}
          topStat={
            vibes.length
              ? `${vibes[0].percentage}% ${vibes[0].label}`
              : undefined
          }
        />
      </Suspense>
    </div>
  );
}
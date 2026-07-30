"use client";

import { ReactNode, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { MuteToggle } from "./MuteToggle";
import { Home, Share2, ChevronRight, Palette } from "lucide-react";

interface StoryShellProps {
  children: ReactNode;
  activeSegment?: number;
}

const SEGMENT_LABELS = [
  "Connect wallet",
  "Top dapps",
  "Transactions of Fury",
  "Vibe check",
  "Persona reveal",
  "Share wrap",
  "Complete",
];

export function StoryShell({ children, activeSegment = 1 }: StoryShellProps) {
  const router = useRouter();
  const segmentLabel =
    SEGMENT_LABELS[activeSegment] ?? `Story segment ${activeSegment + 1}`;

  useEffect(() => {
    const id = window.setTimeout(() => {
      const heading = document.querySelector<HTMLElement>(
        '[data-story-heading="true"], h1, h2, h3',
      );
      if (!heading) return;
      if (!heading.hasAttribute("tabindex")) {
        heading.setAttribute("tabindex", "-1");
      }
      heading.focus({ preventScroll: true });
    }, 100);

    return () => window.clearTimeout(id);
  }, [activeSegment]);

  return (
    <div className="relative min-h-screen bg-[#0a0a0a] text-white overflow-hidden flex flex-col font-sans" style={{ touchAction: "pan-y" }}>
      {/* Deep space gradient - like landing page */}
      <div
        className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/40"
        aria-hidden="true"
      />

      {/* Hexagonal grid pattern - matching landing page */}
      <div className="absolute inset-0 opacity-[0.08]" aria-hidden="true">
        <svg
          className="w-full h-full"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <defs>
            <pattern
              id="hexagons"
              width="60"
              height="52"
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M30 0 L55.98 15 L55.98 45 L30 60 L4.02 45 L4.02 15 Z"
                fill="none"
                stroke="#1DB954"
                strokeWidth="0.5"
              />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#hexagons)" />
        </svg>
      </div>

      {/* Animated scan lines */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        aria-hidden="true"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(29,185,84,0.02) 2px, rgba(29,185,84,0.02) 4px)",
        }}
        animate={{
          backgroundPosition: ["0px 0px", "0px 4px"],
        }}
        transition={{
          duration: 0.15,
          repeat: Infinity,
          ease: "linear",
        }}
      />

      {/* Animated glow orbs - like landing page */}
      <motion.div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] rounded-full blur-[200px] pointer-events-none"
        aria-hidden="true"
        style={{ backgroundColor: "rgba(29, 185, 84, 0.08)" }}
        animate={{
          scale: [1, 1.15, 1],
          opacity: [0.08, 0.15, 0.08],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      <motion.div
        className="absolute bottom-0 left-1/4 w-[600px] h-[400px] rounded-full blur-[150px] pointer-events-none"
        aria-hidden="true"
        style={{ backgroundColor: "rgba(29, 185, 84, 0.06)" }}
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.06, 0.12, 0.06],
        }}
        transition={{
          duration: 10,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      {/* Top Controls */}
      <div className="relative z-50 flex justify-between items-center gap-1 sm:gap-2 md:gap-4 px-2 sm:px-6 md:px-8 lg:px-12 py-3 sm:py-6 md:py-8 overflow-x-auto flex-nowrap">
        {/* Home Button */}
        <motion.button
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          onClick={() => router.push("/")}
          className="shrink-0 flex items-center gap-1.5"
          aria-label="Go to home page"
        >
          <Home
            className="w-4 h-4 group-hover:scale-110 transition-transform"
            aria-hidden="true"
          />
          <span className="hidden sm:inline text-xs sm:text-sm">Home</span>
        </motion.button>

        {/* Segmented Progress Bar */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="flex items-center gap-1 sm:gap-1.5 shrink min-w-0"
        >
          {[...Array(7)].map((_, i) => (
            <motion.div
              key={i}
              aria-hidden="true"
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ delay: 0.4 + i * 0.05 }}
              className={`rounded-full transition-all duration-500 ${
                i === activeSegment
                  ? "w-5 sm:w-10 h-1 sm:h-1.5 bg-[#1DB954] shadow-[0_0_8px_rgba(29,185,84,0.8)] sm:shadow-[0_0_12px_rgba(29,185,84,0.8)]"
                  : i < activeSegment
                    ? "w-2 sm:w-6 h-1 sm:h-1.5 bg-[#1DB954]/50"
                    : "w-2 sm:w-6 h-1 sm:h-1.5 bg-white/15"
              }`}
            />
          ))}
        </motion.div>


        <div className="flex items-center gap-2 shrink-0">

            <MuteToggle />
          {/* Palette Button */}
          <motion.button
            type="button"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.35 }}
            className="p-3 rounded-full bg-black/50 border border-[#1DB954]/30 backdrop-blur-xl hover:bg-[#1DB954]/10 hover:border-[#1DB954]/50 transition-all shadow-[0_0_20px_rgba(29,185,84,0.15)]"
            aria-label="Open color theme picker"
          >
            <Palette className="w-5 h-5 text-[#1DB954]" aria-hidden="true" />
          </motion.button>
        </div>


      </div>

      {/* Main Content */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {segmentLabel}
      </div>

      <div className="flex-1 relative z-10 flex flex-col items-center justify-center">
        {children}
      </div>

      {/* Bottom Controls */}
      <div className="relative z-50 flex justify-between items-center px-3 sm:px-6 md:px-8 lg:px-12 py-3 sm:py-6 md:py-8 gap-2 sm:gap-4">
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Share2 className="w-5 h-5 text-white/70" aria-hidden="true" />
        </motion.button>
        <motion.button
          type="button"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <ChevronRight
            className="w-6 h-6 group-hover:translate-x-1 transition-transform text-white/70"
            aria-hidden="true"
          />
        </motion.button>
      </div>
    </div>
  );
}

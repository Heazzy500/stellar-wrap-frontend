"use client";

import React, { useState, useRef, useEffect, ReactNode } from "react";
import { Loader2 } from "lucide-react";

export type TooltipVariant = "primary" | "secondary" | "disabled" | "loading";
export type TooltipPosition = "top" | "bottom" | "left" | "right";

export interface TooltipProps {
  children: ReactNode;
  content: ReactNode;
  variant?: TooltipVariant;
  position?: TooltipPosition;
  delay?: number;
  disabled?: boolean;
  className?: string;
}

export function Tooltip({
  children,
  content,
  variant = "primary",
  position = "top",
  delay = 200,
  disabled = false,
  className = "",
}: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const isEffectivelyDisabled = disabled || variant === "disabled";
  const isLoading = variant === "loading";

  const showTooltip = () => {
    if (isEffectivelyDisabled) return;
    timerRef.current = setTimeout(() => {
      setIsVisible(true);
    }, delay);
  };

  const hideTooltip = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    setIsVisible(false);
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  // Position classes
  const positionClasses: Record<TooltipPosition, string> = {
    top: "bottom-full left-1/2 -translate-x-1/2 mb-2",
    bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
    left: "right-full top-1/2 -translate-y-1/2 mr-2",
    right: "left-full top-1/2 -translate-y-1/2 ml-2",
  };

  // Variant classes
  const variantClasses: Record<TooltipVariant, string> = {
    primary:
      "bg-[var(--color-theme-primary,#054020)] text-white border border-emerald-500/30 shadow-lg shadow-black/40",
    secondary:
      "bg-zinc-800 text-zinc-100 border border-zinc-700 shadow-lg shadow-black/40",
    disabled:
      "bg-zinc-800/80 text-zinc-400 border border-zinc-700/50 opacity-60 cursor-not-allowed",
    loading:
      "bg-zinc-900 text-zinc-200 border border-emerald-500/40 shadow-lg shadow-black/40",
  };

  return (
    <div
      className={`relative inline-flex items-center ${className}`}
      onMouseEnter={showTooltip}
      onMouseLeave={hideTooltip}
      onFocus={showTooltip}
      onBlur={hideTooltip}
    >
      {children}

      {isVisible && !isEffectivelyDisabled && (
        <div
          role="tooltip"
          className={`absolute z-50 px-2.5 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap pointer-events-none transition-opacity duration-150 flex items-center gap-1.5 ${positionClasses[position]} ${variantClasses[variant]}`}
        >
          {isLoading && (
            <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />
          )}
          <span>{content}</span>
        </div>
      )}
    </div>
  );
}

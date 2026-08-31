import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type ThemeColor =
  | "green"
  | "pink"
  | "yellow"
  | "red"
  | "purple"
  | "cosmic-purple";
export type ThemeMode = "dark" | "light";

export interface ThemeDefinition {
  primary: string;
  primaryRgb: string;
  background: string;
  name: string;
  gradient: string;
}

export const themeColors: Record<ThemeColor, ThemeDefinition> = {
  green: {
    primary: "#1DB954",
    primaryRgb: "29, 185, 84",
    background: "#191414",
    name: "Spotify Green",
    gradient: "linear-gradient(135deg, #1DB954, #1ed760)",
  },
  pink: {
    primary: "#FF6B9D",
    primaryRgb: "255, 107, 157",
    background: "#1a0f14",
    name: "Neon Pink",
    gradient: "linear-gradient(135deg, #FF6B9D, #C44569)",
  },
  yellow: {
    primary: "#FFD700",
    primaryRgb: "255, 215, 0",
    background: "#1a1714",
    name: "Electric Yellow",
    gradient: "linear-gradient(135deg, #FFD700, #FFA500)",
  },
  red: {
    primary: "#FF4444",
    primaryRgb: "255, 68, 68",
    background: "#1a0a0a",
    name: "Hot Red",
    gradient: "linear-gradient(135deg, #FF4444, #CC0000)",
  },
  purple: {
    primary: "#9D4EDD",
    primaryRgb: "157, 78, 221",
    background: "#0d0208",
    name: "Deep Purple",
    gradient: "linear-gradient(135deg, #9D4EDD, #7209B7)",
  },
  "cosmic-purple": {
    primary: "#8B5CF6",
    primaryRgb: "139, 92, 246",
    background: "#0a0416",
    name: "Cosmic Purple",
    gradient: "linear-gradient(135deg, #8B5CF6, #A78BFA, #C4B5FD)",
  },
};

interface ThemeStoreState {
  color: ThemeColor;
  mode: ThemeMode;
  setColor: (color: ThemeColor) => void;
  setMode: (mode: ThemeMode) => void;
  toggleMode: () => void;
}

function getDefaultMode(): ThemeMode {
  if (typeof window !== "undefined") {
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)")
      .matches;
    return prefersDark ? "dark" : "light";
  }
  return "dark";
}

export const useThemeStore = create<ThemeStoreState>()(
  persist(
    (set) => ({
      color: "green",
      mode: getDefaultMode(),

      setColor: (color: ThemeColor) => {
        set({ color });
      },

      setMode: (mode: ThemeMode) => {
        set({ mode });
      },

      toggleMode: () => {
        set((state) => ({
          mode: state.mode === "dark" ? "light" : "dark",
        }));
      },
    }),
    {
      name: "stellar-theme",
      storage: createJSONStorage(() =>
        typeof window !== "undefined"
          ? localStorage
          : {
              getItem: () => null,
              setItem: () => {},
              removeItem: () => {},
            },
      ),
      partialize: (state) => ({
        color: state.color,
        mode: state.mode,
      }),
    },
  ),
);

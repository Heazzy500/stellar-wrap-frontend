"use client"

import React, { createContext, useContext, useEffect } from 'react';
import {
  useThemeStore,
  themeColors,
  type ThemeColor,
  type ThemeMode,
  type ThemeDefinition,
} from '../store/themeStore';

// Re-export types and themeColors for backward compatibility
export type { ThemeColor, ThemeMode, ThemeDefinition };
export { themeColors };

interface ThemeContextType {
  color: ThemeColor;
  setColor: (color: ThemeColor) => void;
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  toggleMode: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const color = useThemeStore((s) => s.color);
  const mode = useThemeStore((s) => s.mode);
  const setColor = useThemeStore((s) => s.setColor);
  const setMode = useThemeStore((s) => s.setMode);
  const toggleMode = useThemeStore((s) => s.toggleMode);

  // Apply CSS variables when color changes (optimistic: instant DOM update)
  useEffect(() => {
    const theme = themeColors[color];
    document.documentElement.style.setProperty('--color-theme-primary', theme.primary);
    document.documentElement.style.setProperty('--color-theme-primary-rgb', theme.primaryRgb);
    document.documentElement.style.setProperty('--color-theme-background', theme.background);
    document.documentElement.style.setProperty('--color-theme-gradient', theme.gradient);
  }, [color]);

  // Apply dark/light mode class when mode changes
  useEffect(() => {
    if (mode === 'dark') {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    } else {
      document.documentElement.classList.add('light');
      document.documentElement.classList.remove('dark');
    }
  }, [mode]);

  // Hydrate CSS variables on initial mount (before first paint settles)
  useEffect(() => {
    const currentColor = useThemeStore.getState().color;
    const currentMode = useThemeStore.getState().mode;
    const theme = themeColors[currentColor];
    document.documentElement.style.setProperty('--color-theme-primary', theme.primary);
    document.documentElement.style.setProperty('--color-theme-primary-rgb', theme.primaryRgb);
    document.documentElement.style.setProperty('--color-theme-background', theme.background);
    document.documentElement.style.setProperty('--color-theme-gradient', theme.gradient);
    if (currentMode === 'dark') {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    } else {
      document.documentElement.classList.add('light');
      document.documentElement.classList.remove('dark');
    }
  }, []);

  return (
    <ThemeContext.Provider value={{ color, setColor, mode, setMode, toggleMode }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};

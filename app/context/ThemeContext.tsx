"use client"

import React, { createContext, useContext, useState, useEffect } from 'react';

export type ThemeColor = 'green' | 'pink' | 'yellow' | 'red' | 'purple' | 'cosmic-purple';
export type ThemeMode = 'dark' | 'light';

interface ThemeContextType {
  color: ThemeColor;
  setColor: (color: ThemeColor) => void;
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  toggleMode: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const themeColors = {
  green: {
    primary: '#1DB954',
    primaryRgb: '29, 185, 84',
    background: '#191414',
    name: 'Spotify Green',
    gradient: 'linear-gradient(135deg, #1DB954, #1ed760)',
  },
  pink: {
    primary: '#FF6B9D',
    primaryRgb: '255, 107, 157',
    background: '#1a0f14',
    name: 'Neon Pink',
    gradient: 'linear-gradient(135deg, #FF6B9D, #C44569)',
  },
  yellow: {
    primary: '#FFD700',
    primaryRgb: '255, 215, 0',
    background: '#1a1714',
    name: 'Electric Yellow',
    gradient: 'linear-gradient(135deg, #FFD700, #FFA500)',
  },
  red: {
    primary: '#FF4444',
    primaryRgb: '255, 68, 68',
    background: '#1a0a0a',
    name: 'Hot Red',
    gradient: 'linear-gradient(135deg, #FF4444, #CC0000)',
  },
  purple: {
    primary: '#9D4EDD',
    primaryRgb: '157, 78, 221',
    background: '#0d0208',
    name: 'Deep Purple',
    gradient: 'linear-gradient(135deg, #9D4EDD, #7209B7)',
  },
  'cosmic-purple': {
    primary: '#8B5CF6',
    primaryRgb: '139, 92, 246',
    background: '#0a0416',
    name: 'Cosmic Purple',
    gradient: 'linear-gradient(135deg, #8B5CF6, #A78BFA, #C4B5FD)',
  },
};

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [color, setColorState] = useState<ThemeColor>(() => {
    // Check if we are in browser environment
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('stellar-theme-color');
      return (saved as ThemeColor) || 'green';
    }
    return 'green';
  });

  const [mode, setModeState] = useState<ThemeMode>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('stellar-theme-mode');
      if (saved === 'dark' || saved === 'light') {
        return saved;
      }
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      return prefersDark ? 'dark' : 'light';
    }
    return 'dark';
  });

  const setColor = (newColor: ThemeColor) => {
    setColorState(newColor);
    localStorage.setItem('stellar-theme-color', newColor);
  };

  const setMode = (newMode: ThemeMode) => {
    setModeState(newMode);
    localStorage.setItem('stellar-theme-mode', newMode);
  };

  const toggleMode = () => {
    setMode(mode === 'dark' ? 'light' : 'dark');
  };

  useEffect(() => {
    const theme = themeColors[color];
    document.documentElement.style.setProperty('--color-theme-primary', theme.primary);
    document.documentElement.style.setProperty('--color-theme-primary-rgb', theme.primaryRgb);
    document.documentElement.style.setProperty('--color-theme-background', theme.background);
    document.documentElement.style.setProperty('--color-theme-gradient', theme.gradient);
  }, [color]);

  useEffect(() => {
    if (mode === 'dark') {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    } else {
      document.documentElement.classList.add('light');
      document.documentElement.classList.remove('dark');
    }
  }, [mode]);

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

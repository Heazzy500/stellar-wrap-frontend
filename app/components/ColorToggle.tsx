"use client"
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Palette, X } from 'lucide-react';
import { useTheme, themeColors, type ThemeColor } from '../context/ThemeContext';

export const ColorToggle = () => {
  const { color, setColor, mode } = useTheme();
  const [isOpen, setIsOpen] = useState(false);

  // Exclude 'white' if originally it was 'red' in the new file, but actually 'white' was in the *old* my-code. 
  // Original file had ['green', 'pink', 'yellow', 'red', 'purple'].
  const colorOptions: ThemeColor[] = ['green', 'pink', 'yellow', 'red', 'purple', 'cosmic-purple'];

  return (
    <div className="relative z-50">
      {/* Toggle Button */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className="w-12 h-12 md:w-14 md:h-14 rounded-full border-2 flex items-center justify-center shadow-lg"
        style={{
          backgroundColor: mode === 'dark' ? '#000' : '#fff',
          borderColor: `var(--color-theme-primary)`,
          boxShadow: `0 0 20px rgba(var(--color-theme-primary-rgb), 0.4)`,
        }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        aria-label={`Theme picker. Current theme: ${themeColors[color].name}`}
        aria-expanded={isOpen}
        aria-haspopup="menu"
      >
        {isOpen ? (
          <X size={20} className="md:w-6 md:h-6" style={{ color: `var(--color-theme-primary)` }} />
        ) : (
          <Palette size={20} className="md:w-6 md:h-6" style={{ color: `var(--color-theme-primary)` }} />
        )}
      </motion.button>

      {/* Color Picker Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="rounded-xl p-3 border absolute top-full left-1/2 -translate-x-1/2 mt-2 w-[160px] sm:w-[200px] z-50"
            style={{
              backgroundColor: mode === 'dark' ? 'rgba(0,0,0,0.9)' : 'rgba(255,255,255,0.95)',
              borderColor: mode === 'dark' ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)',
            }}
          >
            {/* Title */}
            <div className="text-sm font-bold mb-3 text-center tracking-wider" style={{ color: mode === 'dark' ? '#fff' : '#000' }}>
              CHOOSE YOUR VIBE
            </div>

            {/* Color Options */}
            <div className="flex flex-col gap-2">
              {colorOptions.map((colorOption) => {
                const theme = themeColors[colorOption];
                const isActive = color === colorOption;

                return (
                  <motion.button
                    key={colorOption}
                    onClick={() => {
                      setColor(colorOption);
                      setIsOpen(false);
                    }}
                    className="flex items-center gap-3 p-3 rounded-lg transition-all relative overflow-hidden"
                    style={{
                      background: isActive
                        ? `linear-gradient(90deg, ${theme.primary}20, transparent)`
                        : mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0,0,0,0.03)',
                      borderWidth: '2px',
                      borderStyle: 'solid',
                      borderColor: isActive ? theme.primary : 'transparent',
                    }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.98 }}
                    aria-label={`Select ${theme.name} theme`}
                    aria-current={isActive ? "true" : undefined}
                    role="menuitemradio"
                    aria-checked={isActive}
                  >
                    {/* Color Circle */}
                    <div
                      className="w-8 h-8 rounded-full flex-shrink-0"
                      aria-hidden="true"
                      style={{
                        background: theme.gradient,
                        boxShadow: `0 0 15px ${theme.primary}60`,
                      }}
                    />

                    {/* Color Name */}
                    <div className="flex-1 text-left">
                      <div className="text-sm font-bold" style={{ color: mode === 'dark' ? '#fff' : '#000' }}>
                        {theme.name}
                      </div>
                    </div>

                    {/* Active Indicator */}
                    {isActive && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="w-2 h-2 rounded-full"
                        style={{ background: theme.primary }}
                      />
                    )}
                  </motion.button>
                );
              })}
            </div>

            {/* Hint Text */}
            <div className="text-xs text-center mt-3" style={{ color: mode === 'dark' ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)' }}>
              Your theme persists across sessions
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

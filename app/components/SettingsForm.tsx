"use client";

import { useMemo, useState } from 'react';
import { Moon, Sun, Palette, RotateCcw, Save, ShieldCheck } from 'lucide-react';
import { useTheme, themeColors, type ThemeColor, type ThemeMode } from '../context/ThemeContext';

type SettingsFormProps = {
  title?: string;
  description?: string;
  initialMode?: ThemeMode;
  initialColor?: ThemeColor;
  onSave?: (settings: { mode: ThemeMode; color: ThemeColor }) => void;
  onReset?: () => void;
  showSecurityInfo?: boolean;
};

const accentOptions: Array<{ value: ThemeColor; label: string; description: string }> = [
  { value: 'green', label: 'Spotify Green', description: 'Classic brand energy' },
  { value: 'pink', label: 'Neon Pink', description: 'Bold creator vibe' },
  { value: 'yellow', label: 'Electric Yellow', description: 'Bright and warm' },
  { value: 'red', label: 'Hot Red', description: 'High energy' },
  { value: 'purple', label: 'Deep Purple', description: 'Premium contrast' },
  { value: 'cosmic-purple', label: 'Cosmic Purple', description: 'Atmospheric accent' },
];

export function SettingsForm({
  title = 'Appearance',
  description = 'Customize your workspace and how it feels across the app.',
  initialMode,
  initialColor,
  onSave,
  onReset,
  showSecurityInfo = true,
}: SettingsFormProps) {
  const theme = useTheme();
  const currentMode = initialMode ?? theme.mode;
  const currentColor = initialColor ?? theme.color;

  const [mode, setMode] = useState<ThemeMode>(currentMode);
  const [color, setColor] = useState<ThemeColor>(currentColor);

  const activeTheme = useMemo(() => themeColors[color], [color]);

  const handleSave = () => {
    theme.setMode(mode);
    theme.setColor(color);
    onSave?.({ mode, color });
  };

  const handleReset = () => {
    const defaultMode: ThemeMode = 'dark';
    const defaultColor: ThemeColor = 'green';
    setMode(defaultMode);
    setColor(defaultColor);
    theme.setMode(defaultMode);
    theme.setColor(defaultColor);
    onReset?.();
  };

  const isDark = mode === 'dark';
  const backgroundClass = isDark ? 'bg-[#0b0b11] text-white' : 'bg-white text-slate-900';
  const panelClass = isDark ? 'border-white/10 bg-white/5' : 'border-slate-200 bg-slate-50';
  const mutedText = isDark ? 'text-slate-300' : 'text-slate-600';
  const subtleBorder = isDark ? 'border-white/10' : 'border-slate-200';
  const inputBg = isDark ? 'bg-slate-900/80' : 'bg-white';
  const buttonSecondary = isDark ? 'bg-slate-800 text-white hover:bg-slate-700' : 'bg-slate-100 text-slate-900 hover:bg-slate-200';
  const focusRing = isDark ? 'focus-visible:ring-white/70' : 'focus-visible:ring-slate-400';

  return (
    <section
      aria-label="Settings form"
      className={`w-full max-w-3xl rounded-2xl border shadow-[0_20px_50px_rgba(0,0,0,0.12)] transition-colors duration-200 ${backgroundClass} ${panelClass}`}
    >
      <div className="flex flex-col gap-2 border-b px-4 py-5 sm:px-6 md:px-8 md:py-6 ${subtleBorder}">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-theme-primary)]">
              Preferences
            </p>
            <h2 className="mt-2 text-xl font-bold tracking-tight sm:text-2xl">{title}</h2>
          </div>
          <div
            className="flex h-11 w-11 items-center justify-center rounded-xl border border-[var(--color-theme-primary)]/40 bg-[var(--color-theme-primary)]/10"
            aria-hidden="true"
          >
            <Palette className="h-5 w-5 text-[var(--color-theme-primary)]" />
          </div>
        </div>
        <p className={`max-w-2xl text-sm sm:text-base ${mutedText}`}>{description}</p>
      </div>

      <div className="space-y-6 px-4 py-5 sm:px-6 md:px-8 md:py-6">
        <div className={`rounded-2xl border p-4 sm:p-5 ${panelClass}`}>
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-semibold sm:text-lg">Dark mode</h3>
              <p className={`mt-1 text-sm ${mutedText}`}>
                Choose how the interface reads in low-light and bright environments.
              </p>
            </div>
            <div className="flex items-center gap-2 rounded-full border border-[var(--color-theme-primary)]/40 bg-[var(--color-theme-primary)]/10 px-2 py-1.5">
              {isDark ? <Moon className="h-4 w-4 text-[var(--color-theme-primary)]" /> : <Sun className="h-4 w-4 text-[var(--color-theme-primary)]" />}
              <span className="text-xs font-semibold uppercase tracking-wide text-[var(--color-theme-primary)]">
                {isDark ? 'Dark' : 'Light'}
              </span>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {(['dark', 'light'] as ThemeMode[]).map((option) => {
              const selected = mode === option;
              const Icon = option === 'dark' ? Moon : Sun;

              return (
                <button
                  key={option}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  aria-label={`Set ${option} mode`}
                  onClick={() => setMode(option)}
                  className={`group flex items-center justify-between rounded-xl border px-3 py-3 text-left transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${focusRing} ${selected ? 'border-[var(--color-theme-primary)] bg-[var(--color-theme-primary)]/10 ring-1 ring-[var(--color-theme-primary)]/40' : `${subtleBorder} ${buttonSecondary}` }`}
                >
                  <span className="flex items-center gap-3">
                    <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${selected ? 'bg-[var(--color-theme-primary)] text-black' : 'bg-slate-200/80 text-slate-700 dark:bg-slate-700 dark:text-slate-100'}`}>
                      <Icon className="h-4 w-4" />
                    </span>
                    <span>
                      <span className="block text-sm font-semibold capitalize">{option}</span>
                      <span className={`block text-xs ${mutedText}`}>
                        {option === 'dark' ? 'Night-ready contrast' : 'Bright daylight mode'}
                      </span>
                    </span>
                  </span>
                  <span
                    className={`h-3.5 w-3.5 rounded-full border-2 ${selected ? 'border-[var(--color-theme-primary)] bg-[var(--color-theme-primary)]' : 'border-slate-400 bg-transparent'}`}
                    aria-hidden="true"
                  />
                </button>
              );
            })}
          </div>
        </div>

        <div className={`rounded-2xl border p-4 sm:p-5 ${panelClass}`}>
          <div className="mb-4">
            <h3 className="text-base font-semibold sm:text-lg">Theme accent</h3>
            <p className={`mt-1 text-sm ${mutedText}`}>
              Pick the highlight color that defines your experience.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {accentOptions.map((option) => {
              const selected = color === option.value;
              const palette = themeColors[option.value];

              return (
                <button
                  key={option.value}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  aria-label={`Set ${option.label} accent`}
                  onClick={() => setColor(option.value)}
                  className={`flex items-center gap-3 rounded-xl border px-3 py-3 text-left transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${focusRing} ${selected ? 'border-[var(--color-theme-primary)] bg-[var(--color-theme-primary)]/10 ring-1 ring-[var(--color-theme-primary)]/40' : `${subtleBorder} ${buttonSecondary}`}`}
                >
                  <span
                    className="h-8 w-8 shrink-0 rounded-full border border-white/20 shadow-[0_0_0_3px_rgba(255,255,255,0.08)] bg-[var(--color-theme-primary)]"
                    aria-hidden="true"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">{option.label}</span>
                    <span className={`block truncate text-xs ${mutedText}`}>{option.description}</span>
                  </span>
                  <span
                    aria-hidden="true"
                    className={`h-3 w-3 rounded-full border-2 ${selected ? 'border-[var(--color-theme-primary)] bg-[var(--color-theme-primary)]' : 'border-slate-400 bg-transparent'}`}
                  />
                </button>
              );
            })}
          </div>
        </div>

        {showSecurityInfo && (
          <div className={`flex items-start gap-3 rounded-2xl border p-4 ${panelClass}`}>
            <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-400">
              <ShieldCheck className="h-4 w-4" aria-hidden="true" />
            </div>
            <div>
              <h3 className="text-sm font-semibold sm:text-base">Security & preferences</h3>
              <p className={`mt-1 text-sm ${mutedText}`}>
                These preferences are stored locally in your browser and apply across sessions to keep the interface consistent.
              </p>
            </div>
          </div>
        )}
      </div>

      <div className={`flex flex-col gap-3 border-t px-4 py-4 sm:flex-row sm:justify-end sm:px-6 md:px-8 ${subtleBorder}`}>
        <button
          type="button"
          onClick={handleReset}
          className={`inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${focusRing} ${buttonSecondary}`}
          aria-label="Reset settings to default"
        >
          <RotateCcw className="h-4 w-4" aria-hidden="true" />
          Reset
        </button>

        <button
          type="button"
          onClick={handleSave}
          className="bg-theme-gradient inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-black shadow-lg transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--color-theme-primary)] hover:brightness-110 active:translate-y-px"
          aria-label="Save settings"
        >
          <Save className="h-4 w-4" aria-hidden="true" />
          Save settings
        </button>
      </div>
    </section>
  );
}

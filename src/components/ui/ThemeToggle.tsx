'use client';

import React, { useEffect, useState } from 'react';
import { Monitor, Moon, Sun } from 'lucide-react';
import {
  THEME_STORAGE_KEY,
  nextToggleTheme,
  normalizeThemePreference,
  resolveTheme,
  type ResolvedTheme,
  type ThemePreference,
} from '@/lib/theme';

const THEME_CHANGE_EVENT = 'comicplan-theme-change';

function getSystemPrefersDark(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function applyThemeToDocument(preference: ThemePreference): ResolvedTheme {
  const resolved = resolveTheme(preference, getSystemPrefersDark());
  if (typeof document !== 'undefined') {
    document.documentElement.classList.toggle('dark', resolved === 'dark');
    document.documentElement.style.colorScheme = resolved;
  }
  return resolved;
}

export function useTheme() {
  const [preference, setPreferenceState] = useState<ThemePreference>('system');
  const [resolved, setResolved] = useState<ResolvedTheme>('light');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const syncFromStorage = () => {
      try {
        const stored = normalizeThemePreference(localStorage.getItem(THEME_STORAGE_KEY));
        setPreferenceState(stored);
        setResolved(applyThemeToDocument(stored));
      } catch {
        setResolved(applyThemeToDocument('system'));
      }
    };

    syncFromStorage();
    setMounted(true);

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleMediaChange = () => {
      syncFromStorage();
    };
    const handleCustomChange = () => {
      syncFromStorage();
    };

    mediaQuery.addEventListener('change', handleMediaChange);
    window.addEventListener(THEME_CHANGE_EVENT, handleCustomChange);
    window.addEventListener('storage', handleCustomChange);

    return () => {
      mediaQuery.removeEventListener('change', handleMediaChange);
      window.removeEventListener(THEME_CHANGE_EVENT, handleCustomChange);
      window.removeEventListener('storage', handleCustomChange);
    };
  }, []);

  const setPreference = (nextPref: ThemePreference) => {
    setPreferenceState(nextPref);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, nextPref);
    } catch {
      // Abaikan bila localStorage diblokir
    }
    setResolved(applyThemeToDocument(nextPref));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
    }
  };

  const toggleTheme = () => {
    setPreference(nextToggleTheme(resolved));
  };

  return { preference, resolved, mounted, setPreference, toggleTheme };
}

interface ThemeToggleProps {
  className?: string;
  showLabel?: boolean;
}

/**
 * Tombol cepat untuk beralih antara Mode Terang dan Mode Gelap di AppShell.
 */
export function ThemeToggle({ className = '', showLabel = false }: ThemeToggleProps) {
  const { resolved, mounted, toggleTheme } = useTheme();
  const isDark = mounted && resolved === 'dark';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? 'Beralih ke mode terang' : 'Beralih ke mode gelap'}
      title={isDark ? 'Mode terang' : 'Mode gelap'}
      className={`inline-flex items-center justify-center gap-2 rounded-card border border-neutral-200 bg-white px-2.5 py-2 text-xs font-medium text-neutral-600 hover:border-neutral-900 hover:text-neutral-900 transition-colors duration-150 ${className}`}
    >
      {isDark ? (
        <Sun className="h-4 w-4 text-amber-500 shrink-0" aria-hidden="true" />
      ) : (
        <Moon className="h-4 w-4 text-neutral-500 shrink-0" aria-hidden="true" />
      )}
      {showLabel && <span>{isDark ? 'Mode Terang' : 'Mode Gelap'}</span>}
    </button>
  );
}

/**
 * Pemilih 3 mode tema (Terang, Gelap, Sistem) untuk halaman Pengaturan.
 */
export function ThemeSelector() {
  const { preference, mounted, setPreference } = useTheme();

  const options: { value: ThemePreference; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { value: 'light', label: 'Terang', icon: Sun },
    { value: 'dark', label: 'Gelap', icon: Moon },
    { value: 'system', label: 'Sistem', icon: Monitor },
  ];

  return (
    <div
      role="radiogroup"
      aria-label="Pilih tema tampilan"
      className="grid grid-cols-3 gap-2"
    >
      {options.map((opt) => {
        const Icon = opt.icon;
        const active = mounted && preference === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => setPreference(opt.value)}
            className={`flex items-center justify-center gap-2 rounded-card border px-3 py-2.5 text-xs font-medium transition-colors duration-150 ${
              active
                ? 'border-neutral-900 bg-neutral-900 text-white'
                : 'border-neutral-200 bg-white text-neutral-600 hover:border-neutral-900 hover:text-neutral-900'
            }`}
          >
            <Icon className="h-3.5 w-3.5 shrink-0" />
            <span>{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}

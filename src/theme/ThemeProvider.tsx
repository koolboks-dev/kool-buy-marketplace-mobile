import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useColorScheme, useWindowDimensions } from 'react-native';

import { darkColors, lightColors, type ThemeColors } from './tokens';

export type ThemePreference = 'system' | 'light' | 'dark';

interface ThemeContextValue {
  mode: 'light' | 'dark';
  preference: ThemePreference;
  setPreference: (p: ThemePreference) => void;
  colors: ThemeColors;
}

const PREF_KEY = 'kb_theme_pref';
const ThemeContext = createContext<ThemeContextValue | null>(null);

export function AppThemeProvider({ children }: { children: ReactNode }) {
  const system = useColorScheme();
  const [preference, setPref] = useState<ThemePreference>('system');

  useEffect(() => {
    AsyncStorage.getItem(PREF_KEY)
      .then((v) => {
        if (v === 'light' || v === 'dark' || v === 'system') setPref(v);
      })
      .catch(() => {});
  }, []);

  const setPreference = useCallback((p: ThemePreference) => {
    setPref(p);
    AsyncStorage.setItem(PREF_KEY, p).catch(() => {});
  }, []);

  const mode: 'light' | 'dark' = preference === 'system' ? (system === 'dark' ? 'dark' : 'light') : preference;
  const value = useMemo(
    () => ({ mode, preference, setPreference, colors: mode === 'dark' ? darkColors : lightColors }),
    [mode, preference, setPreference],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) return { mode: 'light', preference: 'system', setPreference: () => {}, colors: lightColors };
  return ctx;
}

/**
 * Responsive helpers. Phones get one column; tablets and wide web windows get
 * more columns and a capped content width, like the web marketplace's sm/lg breakpoints.
 */
export function useLayout() {
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;
  const isWide = width >= 1024;
  const contentWidth = Math.min(width, isWide ? 1200 : width);
  const gutter = isTablet ? 24 : 16;
  const columns = (min: number) => Math.max(1, Math.floor((contentWidth - gutter * 2 + 12) / (min + 12)));
  return { width, isTablet, isWide, contentWidth, gutter, columns };
}

import {
  duration,
  elevationNative,
  families,
  radii,
  type ThemeColors,
  themes,
} from '@ekagra/tokens';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, type ReactNode, useCallback, useContext, useEffect, useState } from 'react';

const APPEARANCE_KEY = 'ekagra-appearance';
type Appearance = 'light' | 'dark';

type ThemeValue = ThemeColors & {
  families: typeof families;
  radii: typeof radii;
  duration: typeof duration;
  elevationNative: typeof elevationNative;
  appearance: Appearance;
  setAppearance: (appearance: Appearance) => void;
};

const ThemeContext = createContext<ThemeValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [appearance, setAppearanceState] = useState<Appearance>('light');

  useEffect(() => {
    let mounted = true;
    void AsyncStorage.getItem(APPEARANCE_KEY)
      .then((stored) => {
        if (mounted && (stored === 'light' || stored === 'dark')) setAppearanceState(stored);
      })
      .catch(() => {
        // Light is the safe default when preference storage is unavailable.
      });
    return () => {
      mounted = false;
    };
  }, []);

  const setAppearance = useCallback((next: Appearance) => {
    setAppearanceState(next);
    void AsyncStorage.setItem(APPEARANCE_KEY, next).catch(() => {
      // Keep the in-memory preference active if persistence is unavailable.
    });
  }, []);

  const colors = appearance === 'dark' ? themes.dark : themes.light;
  return (
    <ThemeContext.Provider
      value={{ ...colors, families, radii, duration, elevationNative, appearance, setAppearance }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeValue {
  const value = useContext(ThemeContext);
  if (!value) throw new Error('useTheme must be used inside ThemeProvider');
  return value;
}

export function useSetAppearance(): ThemeValue['setAppearance'] {
  return useTheme().setAppearance;
}

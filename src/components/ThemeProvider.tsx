"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { getThemeSettings, saveThemeSettings } from "../lib/settingsRepository";
import {
  cssVarName,
  defaultThemeSettings,
  resolveThemeColors,
  themePresets,
  type ThemeColors,
  type ThemeMode,
  type ThemeSettings,
} from "../lib/theme";

type ThemeContextValue = {
  settings: ThemeSettings;
  colors: ThemeColors;
  /** Colors for the current mode with no user overrides applied. */
  presetColors: ThemeColors;
  isLoaded: boolean;
  setMode: (mode: ThemeMode) => void;
  setColor: (token: keyof ThemeColors, value: string) => void;
  resetColor: (token: keyof ThemeColors) => void;
  resetAllColors: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

/** Write the resolved palette onto the document root as CSS custom properties. */
function applyColorsToDocument(colors: ThemeColors, mode: ThemeMode) {
  const root = document.documentElement;

  (Object.keys(colors) as (keyof ThemeColors)[]).forEach((token) => {
    root.style.setProperty(cssVarName(token), colors[token]);
  });

  // Lets native widgets (scrollbars, date pickers) match the theme.
  root.style.colorScheme = mode;
  root.dataset.themeMode = mode;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<ThemeSettings>(defaultThemeSettings);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    getThemeSettings().then((stored) => {
      setSettings(stored);
      setIsLoaded(true);
    });
  }, []);

  const colors = useMemo(() => resolveThemeColors(settings), [settings]);

  useEffect(() => {
    applyColorsToDocument(colors, settings.mode);
  }, [colors, settings.mode]);

  const update = useCallback((next: ThemeSettings) => {
    setSettings(next);
    void saveThemeSettings(next);
  }, []);

  const setMode = useCallback(
    (mode: ThemeMode) => {
      update({ ...settings, mode });
    },
    [settings, update],
  );

  const setColor = useCallback(
    (token: keyof ThemeColors, value: string) => {
      update({
        ...settings,
        overrides: {
          ...settings.overrides,
          [settings.mode]: { ...(settings.overrides[settings.mode] ?? {}), [token]: value },
        },
      });
    },
    [settings, update],
  );

  const resetColor = useCallback(
    (token: keyof ThemeColors) => {
      const modeOverrides = { ...(settings.overrides[settings.mode] ?? {}) };
      delete modeOverrides[token];

      update({
        ...settings,
        overrides: { ...settings.overrides, [settings.mode]: modeOverrides },
      });
    },
    [settings, update],
  );

  const resetAllColors = useCallback(() => {
    const overrides = { ...settings.overrides };
    delete overrides[settings.mode];
    update({ ...settings, overrides });
  }, [settings, update]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      settings,
      colors,
      presetColors: themePresets[settings.mode],
      isLoaded,
      setMode,
      setColor,
      resetColor,
      resetAllColors,
    }),
    [settings, colors, isLoaded, setMode, setColor, resetColor, resetAllColors],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}

export default ThemeProvider;

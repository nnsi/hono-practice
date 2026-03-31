import { createContext, useContext, useMemo } from "react";

import { type ThemePreference, useTheme } from "../hooks/useTheme";
import { type ThemeColors, getThemeColors } from "../utils/themeColors";

type ThemeContextType = {
  preference: ThemePreference;
  isDark: boolean;
  ready: boolean;
  colors: ThemeColors;
  setTheme: (next: ThemePreference) => void;
};

const ThemeContext = createContext<ThemeContextType>({
  preference: "system",
  isDark: false,
  ready: false,
  colors: getThemeColors(false),
  setTheme: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { preference, isDark, ready, setTheme } = useTheme();
  const colors = useMemo(() => getThemeColors(isDark), [isDark]);

  return (
    <ThemeContext.Provider
      value={{ preference, isDark, ready, colors, setTheme }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useThemeContext() {
  return useContext(ThemeContext);
}

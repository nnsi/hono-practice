import { createContext, useContext, useMemo } from "react";

import { type ThemePreference, useTheme } from "../hooks/useTheme";
import { type ThemeColors, getThemeColors } from "../utils/themeColors";

type ThemeContextType = {
  preference: ThemePreference;
  isDark: boolean;
  colors: ThemeColors;
  setTheme: (next: ThemePreference) => void;
};

const ThemeContext = createContext<ThemeContextType>({
  preference: "system",
  isDark: false,
  colors: getThemeColors(false),
  setTheme: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { preference, isDark, setTheme } = useTheme();
  const colors = useMemo(() => getThemeColors(isDark), [isDark]);

  // A parent route update is not a theme change; avoid redrawing hidden tabs.
  const value = useMemo(
    () => ({ preference, isDark, colors, setTheme }),
    [preference, isDark, colors, setTheme],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useThemeContext() {
  return useContext(ThemeContext);
}

import { useEffect, useState } from "react";

import AsyncStorage from "@react-native-async-storage/async-storage";
import { useColorScheme } from "nativewind";

export type ThemePreference = "light" | "dark" | "system";

const THEME_KEY = "actiko-v2-theme";

export function useTheme() {
  const { colorScheme, setColorScheme } = useColorScheme();
  const [preference, setPreference] = useState<ThemePreference>("system");

  // Load saved preference on mount
  useEffect(() => {
    AsyncStorage.getItem(THEME_KEY).then((stored) => {
      if (stored === "light" || stored === "dark" || stored === "system") {
        setPreference(stored);
        setColorScheme(stored);
      }
    });
  }, []);

  const setTheme = (next: ThemePreference) => {
    setPreference(next);
    setColorScheme(next);
    AsyncStorage.setItem(THEME_KEY, next);
  };

  const isDark = colorScheme === "dark";

  return { preference, isDark, setTheme } as const;
}

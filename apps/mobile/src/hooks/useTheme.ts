import { useCallback, useEffect, useState } from "react";

import AsyncStorage from "@react-native-async-storage/async-storage";
import { useColorScheme } from "nativewind";
import { Appearance } from "react-native";

export type ThemePreference = "light" | "dark" | "system";

const THEME_KEY = "actiko-v2-theme";

function resolveSystemTheme(): "light" | "dark" {
  const raw = Appearance.getColorScheme();
  return raw === "dark" ? "dark" : "light";
}

/** "system" を実際の light/dark に解決してから setColorScheme に渡す */
function applyColorScheme(
  setColorScheme: (scheme: "light" | "dark" | "system") => void,
  pref: ThemePreference,
): void {
  try {
    if (pref === "system") {
      setColorScheme(resolveSystemTheme());
    } else {
      setColorScheme(pref);
    }
  } catch {
    // nativewind 内部エラー時はフォールバック
    try {
      setColorScheme("light");
    } catch {
      // 何もできない
    }
  }
}

export function useTheme() {
  const { colorScheme, setColorScheme } = useColorScheme();
  const [preference, setPreference] = useState<ThemePreference>("system");

  // Load saved preference on mount
  useEffect(() => {
    AsyncStorage.getItem(THEME_KEY)
      .then((stored) => {
        if (stored === "light" || stored === "dark" || stored === "system") {
          setPreference(stored);
          applyColorScheme(setColorScheme, stored);
        }
      })
      .catch(() => {
        // AsyncStorage 読み取り失敗時はデフォルトのまま
      });
  }, [setColorScheme]);

  // "system" 選択中はシステムテーマ変更を追従
  useEffect(() => {
    if (preference !== "system") return;
    const sub = Appearance.addChangeListener(() => {
      try {
        setColorScheme(resolveSystemTheme());
      } catch {
        // ignore
      }
    });
    return () => sub.remove();
  }, [preference, setColorScheme]);

  const setTheme = useCallback(
    (next: ThemePreference) => {
      setPreference(next);
      applyColorScheme(setColorScheme, next);
      AsyncStorage.setItem(THEME_KEY, next).catch(() => {
        // 書き込み失敗は無視（次回起動時にデフォルトに戻る）
      });
    },
    [setColorScheme],
  );

  const isDark = colorScheme === "dark";

  return { preference, isDark, setTheme } as const;
}

/** ErrorBoundary 復旧時にテーマ設定もクリアする */
export async function clearThemePreference(): Promise<void> {
  try {
    await AsyncStorage.removeItem(THEME_KEY);
  } catch {
    // ignore
  }
}

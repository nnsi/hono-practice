import { useCallback, useEffect, useState } from "react";

import type { StorageAdapter } from "../../adapters/types";
import { type AppSettings, defaultSettings } from "../../types/settings";

// Re-export for external use
export type { AppSettings };
export { defaultSettings };

const SETTINGS_KEY = "actiko_app_settings";

type UseAppSettingsDependencies = {
  storage: StorageAdapter;
};

export const createUseAppSettings = (deps: UseAppSettingsDependencies) => {
  return () => {
    const { storage } = deps;
    const [settings, setSettings] = useState<AppSettings>(defaultSettings);
    const [isLoaded, setIsLoaded] = useState(false);

    // 設定の読み込み（初回のみ）
    useEffect(() => {
      if (isLoaded) return;

      const loadSettings = async () => {
        try {
          const saved = await storage.getItem(SETTINGS_KEY);
          if (saved) {
            setSettings({ ...defaultSettings, ...JSON.parse(saved) });
          }
        } catch (e) {
          console.error("Failed to load settings:", e);
        } finally {
          setIsLoaded(true);
        }
      };
      loadSettings();
    }, [storage, isLoaded]);

    const updateSetting = useCallback(
      async <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
        setSettings((prevSettings) => {
          const newSettings = {
            ...prevSettings,
            [key]: value,
          };

          // 設定を即座に保存（非同期だがawaitしない）
          storage
            .setItem(SETTINGS_KEY, JSON.stringify(newSettings))
            .catch((e) => {
              console.error("Failed to save settings:", e);
            });

          return newSettings;
        });
      },
      [storage],
    );

    return {
      settings,
      updateSetting,
      isLoaded,
    };
  };
};

import { useCallback, useEffect, useState } from "react";

import { type AppSettings, defaultSettings } from "../../types/settings";

import type { StorageAdapter } from "../../adapters/types";

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

    // 設定の読み込み
    useEffect(() => {
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
    }, [storage]);

    // 設定の保存
    useEffect(() => {
      if (!isLoaded) return; // 初回読み込み前は保存しない

      const saveSettings = async () => {
        try {
          await storage.setItem(SETTINGS_KEY, JSON.stringify(settings));
        } catch (e) {
          console.error("Failed to save settings:", e);
        }
      };
      saveSettings();
    }, [settings, storage, isLoaded]);

    const updateSetting = useCallback(
      <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
        setSettings((prev) => ({
          ...prev,
          [key]: value,
        }));
      },
      [],
    );

    return {
      settings,
      updateSetting,
      isLoaded,
    };
  };
};

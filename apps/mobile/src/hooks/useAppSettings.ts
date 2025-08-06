import { useEffect, useState } from "react";

import AsyncStorage from "@react-native-async-storage/async-storage";

export type AppSettings = {
  showGoalOnStartup: boolean;
  hideGoalGraph: boolean;
  showInactiveDates: boolean;
};

const DEFAULT_SETTINGS: AppSettings = {
  showGoalOnStartup: false,
  hideGoalGraph: false,
  showInactiveDates: false,
};

const SETTINGS_KEY = "app_settings";

export function useAppSettings() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);

  // Load settings from AsyncStorage
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const stored = await AsyncStorage.getItem(SETTINGS_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          setSettings({ ...DEFAULT_SETTINGS, ...parsed });
        }
      } catch (error) {
        console.error("Failed to load settings:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, []);

  // Update a setting
  const updateSetting = async <K extends keyof AppSettings>(
    key: K,
    value: AppSettings[K],
  ) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);

    try {
      await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(newSettings));
    } catch (error) {
      console.error("Failed to save settings:", error);
    }
  };

  // Reset all settings
  const resetSettings = async () => {
    setSettings(DEFAULT_SETTINGS);
    try {
      await AsyncStorage.removeItem(SETTINGS_KEY);
    } catch (error) {
      console.error("Failed to reset settings:", error);
    }
  };

  return {
    settings,
    updateSetting,
    resetSettings,
    isLoading,
  };
}

import { useEffect, useState } from "react";

import AsyncStorage from "@react-native-async-storage/async-storage";

export const SETTINGS_KEY = "actiko-v2-settings";

export type AppSettings = {
  showGoalOnStartup: boolean;
  showInactiveDates: boolean;
  praiseMode: boolean;
};

const defaultSettings: AppSettings = {
  showGoalOnStartup: false,
  showInactiveDates: false,
  praiseMode: false,
};

export function useAppSettings() {
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  useEffect(() => {
    AsyncStorage.getItem(SETTINGS_KEY).then((raw) => {
      if (!raw) return;
      try {
        setSettings({ ...defaultSettings, ...JSON.parse(raw) });
      } catch {
        AsyncStorage.removeItem(SETTINGS_KEY);
      }
    });
  }, []);
  const updateSetting = (key: keyof AppSettings, value: boolean) => {
    setSettings((prev) => {
      const next = { ...prev, [key]: value };
      AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
      return next;
    });
  };
  return { settings, updateSetting };
}

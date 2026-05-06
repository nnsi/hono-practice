import { useEffect, useState } from "react";

import AsyncStorage from "@react-native-async-storage/async-storage";

export const SETTINGS_KEY = "actiko-v2-settings";

export type AppSettings = {
  showGoalOnStartup: boolean;
  showInactiveDates: boolean;
  praiseMode: boolean;
  showCompletedTasks: boolean;
};

const defaultSettings: AppSettings = {
  showGoalOnStartup: false,
  showInactiveDates: false,
  praiseMode: false,
  showCompletedTasks: false,
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readStoredSettingsObject(raw: string | null) {
  if (!raw) return {};

  try {
    const parsed = JSON.parse(raw);
    return isRecord(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function normalizeAppSettings(
  storedSettings: Record<string, unknown>,
): AppSettings {
  return {
    showGoalOnStartup:
      typeof storedSettings.showGoalOnStartup === "boolean"
        ? storedSettings.showGoalOnStartup
        : defaultSettings.showGoalOnStartup,
    showInactiveDates:
      typeof storedSettings.showInactiveDates === "boolean"
        ? storedSettings.showInactiveDates
        : defaultSettings.showInactiveDates,
    praiseMode:
      typeof storedSettings.praiseMode === "boolean"
        ? storedSettings.praiseMode
        : defaultSettings.praiseMode,
    showCompletedTasks:
      typeof storedSettings.showCompletedTasks === "boolean"
        ? storedSettings.showCompletedTasks
        : defaultSettings.showCompletedTasks,
  };
}

export function useAppSettings() {
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  useEffect(() => {
    AsyncStorage.getItem(SETTINGS_KEY).then((raw) => {
      const storedSettings = readStoredSettingsObject(raw);
      if (!raw && Object.keys(storedSettings).length === 0) {
        return;
      }

      const next = normalizeAppSettings(storedSettings);
      setSettings(next);
      void AsyncStorage.setItem(
        SETTINGS_KEY,
        JSON.stringify({ ...storedSettings, ...next }),
      );
    });
  }, []);
  const updateSetting = (key: keyof AppSettings, value: boolean) => {
    setSettings((prev) => {
      const next = { ...prev, [key]: value };
      AsyncStorage.getItem(SETTINGS_KEY).then((raw) => {
        void AsyncStorage.setItem(
          SETTINGS_KEY,
          JSON.stringify({ ...readStoredSettingsObject(raw), ...next }),
        );
      });
      return next;
    });
  };
  return { settings, updateSetting };
}

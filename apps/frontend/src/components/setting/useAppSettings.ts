import { useState } from "react";

import { z } from "zod";

export const SETTINGS_KEY = "actiko-v2-settings";

const AppSettingsSchema = z.object({
  showGoalOnStartup: z.boolean(),
  showInactiveDates: z.boolean(),
  praiseMode: z.boolean().default(false),
});

type AppSettings = z.infer<typeof AppSettingsSchema>;

const defaultSettings: AppSettings = {
  showGoalOnStartup: false,
  showInactiveDates: false,
  praiseMode: false,
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readStoredSettingsObject() {
  const raw = localStorage.getItem(SETTINGS_KEY);
  if (!raw) return {};

  try {
    const parsed = JSON.parse(raw);
    return isRecord(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

export function useAppSettings() {
  const [settings, setSettings] = useState<AppSettings>(() => {
    const storedSettings = readStoredSettingsObject();
    const parsed = AppSettingsSchema.safeParse(storedSettings);
    if (parsed.success) {
      return parsed.data;
    }

    if (Object.keys(storedSettings).length > 0) {
      localStorage.setItem(
        SETTINGS_KEY,
        JSON.stringify({ ...storedSettings, ...defaultSettings }),
      );
    }

    return defaultSettings;
  });

  const updateSetting = (key: keyof AppSettings, value: boolean) => {
    setSettings((prev) => {
      const next = { ...prev, [key]: value };
      localStorage.setItem(
        SETTINGS_KEY,
        JSON.stringify({ ...readStoredSettingsObject(), ...next }),
      );
      return next;
    });
  };

  return { settings, updateSetting };
}

export function clearAppSettings() {
  localStorage.removeItem(SETTINGS_KEY);
}

import { useState } from "react";

import { z } from "zod";

const SETTINGS_KEY = "actiko-v2-settings";

const AppSettingsSchema = z.object({
  showGoalOnStartup: z.boolean(),
  showInactiveDates: z.boolean(),
  praiseMode: z.boolean().default(false),
});

export type AppSettings = z.infer<typeof AppSettingsSchema>;

const defaultSettings: AppSettings = {
  showGoalOnStartup: false,
  showInactiveDates: false,
  praiseMode: false,
};

export function useAppSettings() {
  const [settings, setSettings] = useState<AppSettings>(() => {
    const stored = localStorage.getItem(SETTINGS_KEY);
    if (stored) {
      try {
        const parsed = AppSettingsSchema.safeParse(JSON.parse(stored));
        if (parsed.success) return parsed.data;
        localStorage.removeItem(SETTINGS_KEY);
      } catch {
        localStorage.removeItem(SETTINGS_KEY);
      }
    }
    return defaultSettings;
  });

  const updateSetting = (key: keyof AppSettings, value: boolean) => {
    setSettings((prev) => {
      const next = { ...prev, [key]: value };
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
      return next;
    });
  };

  return { settings, updateSetting };
}

export function clearAppSettings() {
  localStorage.removeItem(SETTINGS_KEY);
}

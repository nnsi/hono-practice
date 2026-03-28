import i18next from "i18next";
import { initReactI18next } from "react-i18next";

import actikoEn from "./locales/en/actiko.json";
import activityEn from "./locales/en/activity.json";
import commonEn from "./locales/en/common.json";
import csvEn from "./locales/en/csv.json";
import feedbackEn from "./locales/en/feedback.json";
import goalEn from "./locales/en/goal.json";
import recordingEn from "./locales/en/recording.json";
import settingsEn from "./locales/en/settings.json";
import statsEn from "./locales/en/stats.json";
import taskEn from "./locales/en/task.json";
import validationEn from "./locales/en/validation.json";
import actikoJa from "./locales/ja/actiko.json";
import activityJa from "./locales/ja/activity.json";
import commonJa from "./locales/ja/common.json";
import csvJa from "./locales/ja/csv.json";
import feedbackJa from "./locales/ja/feedback.json";
import goalJa from "./locales/ja/goal.json";
import recordingJa from "./locales/ja/recording.json";
import settingsJa from "./locales/ja/settings.json";
import statsJa from "./locales/ja/stats.json";
import taskJa from "./locales/ja/task.json";
import validationJa from "./locales/ja/validation.json";
import "./types";

export const defaultNS = "common" as const;

const allNS = [
  "common",
  "validation",
  "activity",
  "goal",
  "feedback",
  "task",
  "stats",
  "settings",
  "csv",
  "actiko",
  "recording",
] as const;

export const resources = {
  ja: {
    common: commonJa,
    validation: validationJa,
    activity: activityJa,
    goal: goalJa,
    feedback: feedbackJa,
    task: taskJa,
    stats: statsJa,
    settings: settingsJa,
    csv: csvJa,
    actiko: actikoJa,
    recording: recordingJa,
  },
  en: {
    common: commonEn,
    validation: validationEn,
    activity: activityEn,
    goal: goalEn,
    feedback: feedbackEn,
    task: taskEn,
    stats: statsEn,
    settings: settingsEn,
    csv: csvEn,
    actiko: actikoEn,
    recording: recordingEn,
  },
} as const;

type I18nPlugin = Parameters<typeof i18next.use>[0];

type InitOptions = {
  lng?: string;
  plugins?: I18nPlugin[];
  detection?: Record<string, unknown>;
  onLanguageChanged?: (lng: string) => void;
};

export function initI18n(options?: InitOptions) {
  let instance = i18next.use(initReactI18next);
  for (const plugin of options?.plugins ?? []) {
    instance = instance.use(plugin);
  }
  if (options?.onLanguageChanged) {
    const cb = options.onLanguageChanged;
    i18next.on("languageChanged", cb);
  }
  return instance.init({
    resources,
    lng: options?.lng,
    fallbackLng: "ja",
    defaultNS,
    ns: [...allNS],
    interpolation: { escapeValue: false },
    detection: options?.detection,
  });
}

export { i18next };

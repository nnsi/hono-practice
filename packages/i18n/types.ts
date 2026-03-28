import type actiko from "./locales/ja/actiko.json";
import type activity from "./locales/ja/activity.json";
import type common from "./locales/ja/common.json";
import type csv from "./locales/ja/csv.json";
import type feedback from "./locales/ja/feedback.json";
import type goal from "./locales/ja/goal.json";
import type recording from "./locales/ja/recording.json";
import type settings from "./locales/ja/settings.json";
import type stats from "./locales/ja/stats.json";
import type task from "./locales/ja/task.json";
import type validation from "./locales/ja/validation.json";

export type Resources = {
  common: typeof common;
  validation: typeof validation;
  activity: typeof activity;
  goal: typeof goal;
  feedback: typeof feedback;
  task: typeof task;
  stats: typeof stats;
  settings: typeof settings;
  csv: typeof csv;
  actiko: typeof actiko;
  recording: typeof recording;
};

declare module "i18next" {
  interface CustomTypeOptions {
    defaultNS: "common";
    resources: Resources;
  }
}

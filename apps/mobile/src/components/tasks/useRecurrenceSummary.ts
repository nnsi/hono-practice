import type { TaskScheduleRecord } from "@packages/domain/taskSchedule";
import {
  type RecurrenceSummaryLabels,
  formatRecurrenceSummary,
} from "@packages/frontend-shared/hooks/taskScheduleSummary";
import { useTranslation } from "@packages/i18n";

/** 「3日ごと」「月・水・金」の i18n 済み要約を返す */
export function useRecurrenceSummary() {
  const { t } = useTranslation("task");
  const labels: RecurrenceSummaryLabels = {
    daily: t("schedules.summary.daily"),
    interval: (days) => t("schedules.summary.interval", { days }),
    weekday: (day) => t(`create.recurrence.weekday.${day}`),
    weekdaySeparator: t("schedules.summary.weekdaySeparator"),
  };
  return (schedule: TaskScheduleRecord) =>
    formatRecurrenceSummary(schedule, labels);
}

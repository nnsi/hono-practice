import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";

import type { TaskScheduleRecord } from "./taskScheduleRecord";

dayjs.extend(utc);

/** Dates are validated YYYY-MM-DD calendar dates, independent of the host TZ. */
export function isTaskScheduleDueOn(
  schedule: TaskScheduleRecord,
  date: string,
): boolean {
  if (
    !schedule.isActive ||
    date < schedule.startDate ||
    (schedule.endDate !== null && date > schedule.endDate)
  ) {
    return false;
  }

  const target = dayjs.utc(date);
  if (schedule.recurrenceType === "interval") {
    const interval = schedule.intervalDays;
    return (
      interval !== null &&
      Number.isInteger(interval) &&
      interval >= 1 &&
      target.diff(dayjs.utc(schedule.startDate), "day") % interval === 0
    );
  }
  // day(): 0=Sunday → ISO weekday: 7=Sunday (same mapping as dayTargets).
  return schedule.weekdays?.includes(target.day() || 7) ?? false;
}

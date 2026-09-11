import dayjs from "dayjs";

import type { TaskItem } from "../task/types";
import { isTaskScheduleDueOn } from "./isScheduleDueOn";
import { createScheduledTaskId } from "./scheduledTaskId";
import type { TaskScheduleRecord } from "./taskScheduleRecord";

export type VirtualScheduledTask = TaskItem & {
  isVirtual: true;
  scheduleId: string;
  scheduledDate: string;
  startDate: string;
  dueDate: string;
  doneDate: null;
  archivedAt: null;
};

export type ResolveTodayScheduledTasksInput = {
  schedules: readonly TaskScheduleRecord[];
  /** Include completed, archived and deleted rows to prevent resurrection. */
  tasksOnDate: readonly Pick<TaskItem, "scheduleId" | "scheduledDate">[];
  today: string;
};

export function resolveTodayScheduledTasks({
  schedules,
  tasksOnDate,
  today,
}: ResolveTodayScheduledTasksInput): VirtualScheduledTask[] {
  const existing = new Set(
    tasksOnDate
      .filter((task) => task.scheduledDate === today)
      .map((task) => task.scheduleId),
  );
  return schedules
    .filter(
      (schedule) =>
        schedule.deletedAt == null &&
        !existing.has(schedule.id) &&
        isTaskScheduleDueOn(schedule, today),
    )
    .sort((a, b) => {
      const timeDifference = dayjs(a.createdAt).diff(dayjs(b.createdAt));
      return timeDifference || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
    })
    .map((schedule) => ({
      id: createScheduledTaskId(schedule.id, today),
      userId: schedule.userId,
      activityId: schedule.activityId,
      activityKindId: schedule.activityKindId,
      quantity: schedule.quantity,
      title: schedule.title,
      memo: schedule.memo ?? "",
      startDate: today,
      dueDate: today,
      scheduledDate: today,
      doneDate: null,
      scheduleId: schedule.id,
      archivedAt: null,
      createdAt: schedule.createdAt,
      updatedAt: schedule.updatedAt,
      isVirtual: true,
    }));
}

import type { TaskRecord } from "@packages/domain/task/taskRecord";
import type { TaskScheduleRecord } from "@packages/sync-engine";

export const userId = "00000000-0000-4000-8000-000000000001";
export const scheduleId = "00000000-0000-4000-8000-000000000002";
export const today = "2026-09-10";
export const stamp = "2026-09-10T00:00:00.000Z";
export const schedule: TaskScheduleRecord = {
  id: scheduleId,
  userId,
  title: "Schedule",
  activityId: null,
  activityKindId: null,
  quantity: 3,
  memo: null,
  startDate: today,
  endDate: null,
  recurrenceType: "weekdays",
  intervalDays: null,
  weekdays: [1, 4, 7],
  isActive: true,
  createdAt: stamp,
  updatedAt: stamp,
  deletedAt: null,
};
export const task: TaskRecord = {
  id: "task-1",
  userId,
  title: "Scheduled task",
  activityId: null,
  activityKindId: null,
  quantity: null,
  memo: "",
  startDate: today,
  dueDate: null,
  doneDate: today,
  archivedAt: stamp,
  scheduleId,
  scheduledDate: today,
  createdAt: stamp,
  updatedAt: stamp,
  deletedAt: stamp,
};

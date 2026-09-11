import type { TaskScheduleRecord } from "./taskScheduleRecord";

export function makeSchedule(
  overrides: Partial<TaskScheduleRecord> = {},
): TaskScheduleRecord {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    userId: "22222222-2222-4222-8222-222222222222",
    activityId: "33333333-3333-4333-8333-333333333333",
    activityKindId: "44444444-4444-4444-8444-444444444444",
    quantity: 10,
    title: "筋トレ",
    memo: "3セット",
    recurrenceType: "interval",
    intervalDays: 2,
    weekdays: null,
    startDate: "2026-09-10",
    endDate: null,
    isActive: true,
    createdAt: "2026-09-01T00:00:00.000Z",
    updatedAt: "2026-09-02T00:00:00.000Z",
    deletedAt: null,
    ...overrides,
  };
}

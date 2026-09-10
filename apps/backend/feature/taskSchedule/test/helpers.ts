import { newHonoWithErrorHandling } from "@backend/lib/honoWithErrorHandling";
import { mockAuthMiddleware } from "@backend/middleware/mockAuthMiddleware";
import { TEST_USER_ID, testDB } from "@backend/test.setup";
import { activities, taskSchedules, users } from "@infra/drizzle/schema";

import { createTaskRoute } from "../../task";
import { createTaskScheduleRoute } from "..";

export const activityId = "00000000-0000-4000-8000-000000000001";
export const otherActivityId = "00000000-0000-4000-8000-000000000002";
export const scheduleBody = {
  title: "筋トレ",
  startDate: "2026-09-10",
  recurrenceType: "interval",
  intervalDays: 2,
};
export function createApp() {
  return newHonoWithErrorHandling()
    .use(mockAuthMiddleware)
    .route("/users/task-schedules", createTaskScheduleRoute())
    .route("/users/tasks", createTaskRoute());
}
export function request(
  method = "GET",
  path = "/users/task-schedules",
  body?: unknown,
) {
  return createApp().request(
    path,
    {
      method,
      headers: { "Content-Type": "application/json" },
      ...(body !== undefined && { body: JSON.stringify(body) }),
    },
    { DB: testDB },
  );
}
export async function seedSchedule() {
  const [row] = await testDB
    .insert(taskSchedules)
    .values({
      title: "筋トレ",
      startDate: "2026-09-10",
      recurrenceType: "interval",
      intervalDays: 2,
      userId: TEST_USER_ID,
    })
    .returning();
  return row;
}
export async function seedOtherUser() {
  const id = crypto.randomUUID();
  await testDB.insert(users).values({ id, loginId: id, name: "other" });
  const [activity] = await testDB
    .insert(activities)
    .values({
      userId: id,
      name: "other",
      label: "other",
      emoji: "🏃",
      orderIndex: "a",
      quantityUnit: "回",
    })
    .returning();
  const [schedule] = await testDB
    .insert(taskSchedules)
    .values({
      userId: id,
      title: "private",
      startDate: "2026-09-10",
      recurrenceType: "interval",
      intervalDays: 1,
    })
    .returning();
  return { userId: id, activityId: activity.id, scheduleId: schedule.id };
}

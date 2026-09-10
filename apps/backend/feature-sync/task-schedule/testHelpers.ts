import { newHonoWithErrorHandling } from "@backend/lib/honoWithErrorHandling";
import { mockAuthMiddleware } from "@backend/middleware/mockAuthMiddleware";
import { testDB } from "@backend/test.setup";

import { taskSyncRoute } from "../task/taskSyncRoute";
import { taskScheduleSyncRoute } from ".";
export function makeSchedule(overrides: Record<string, unknown> = {}) {
  return {
    id: crypto.randomUUID(),
    title: "筋トレ",
    recurrenceType: "interval",
    intervalDays: 2,
    weekdays: null,
    startDate: "2026-09-10",
    endDate: null,
    activityId: null,
    activityKindId: null,
    quantity: null,
    memo: "",
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    deletedAt: null,
    ...overrides,
  };
}
export function syncRequest(body: unknown) {
  return request("POST", "/users/v2/task-schedules/sync", body);
}
export function request(
  method = "GET",
  path = "/users/v2/task-schedules",
  body?: unknown,
) {
  const app = newHonoWithErrorHandling()
    .use(mockAuthMiddleware)
    .route("/users/v2", taskScheduleSyncRoute)
    .route("/users/v2", taskSyncRoute);
  return app.request(
    path,
    {
      method,
      headers: { "Content-Type": "application/json" },
      ...(body !== undefined && { body: JSON.stringify(body) }),
    },
    { DB: testDB },
  );
}

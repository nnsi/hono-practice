import { newHonoWithErrorHandling } from "@backend/lib/honoWithErrorHandling";
import { mockAuthMiddleware } from "@backend/middleware/mockAuthMiddleware";
import { testDB } from "@backend/test.setup";

import { goalSyncRoute } from "./goalSyncRoute";

export const SEED_ACTIVITY_ID = "00000000-0000-4000-8000-000000000001";

export function makeGoal(overrides: Record<string, unknown> = {}) {
  const now = new Date().toISOString();
  return {
    id: "10000000-0000-4000-8000-000000000001",
    activityId: SEED_ACTIVITY_ID,
    dailyTargetQuantity: 10,
    startDate: "2025-01-01",
    endDate: null,
    isActive: true,
    description: "",
    debtCap: null,
    dayTargets: null,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    ...overrides,
  };
}

export function createApp() {
  return newHonoWithErrorHandling()
    .use(mockAuthMiddleware)
    .route("/users/v2", goalSyncRoute);
}

export async function postSync(
  app: ReturnType<typeof createApp>,
  body: Record<string, unknown>,
) {
  return app.request(
    "/users/v2/goals/sync",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
    { DB: testDB },
  );
}

export async function getGoals(app: ReturnType<typeof createApp>, query = "") {
  return app.request(
    `/users/v2/goals${query ? `?${query}` : ""}`,
    { method: "GET" },
    { DB: testDB },
  );
}

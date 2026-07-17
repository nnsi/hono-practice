import { testClient } from "hono/testing";

import { newHonoWithErrorHandling } from "@backend/lib/honoWithErrorHandling";
import { mockAuthMiddleware } from "@backend/middleware/mockAuthMiddleware";
import { TEST_USER_ID, testDB } from "@backend/test.setup";
import { okJson } from "@backend/test-utils/okJson";
import * as schema from "@infra/drizzle/schema";
import { expect, test } from "vitest";

import { createGoalRoute } from "../goalRoute";

test("GET goals / success", async () => {
  const route = createGoalRoute();
  const app = newHonoWithErrorHandling()
    .use(mockAuthMiddleware)
    .route("/", route);
  const client = testClient(app, {
    DB: testDB,
  });

  const res = await client.index.$get();

  expect(res.status).toEqual(200);
});

test("GET goals / with activity filter", async () => {
  const route = createGoalRoute();
  const app = newHonoWithErrorHandling()
    .use(mockAuthMiddleware)
    .route("/", route);
  const client = testClient(app, {
    DB: testDB,
  });

  const res = await client.index.$get({
    query: { activityId: "00000000-0000-4000-8000-000000000001" },
  });

  expect(res.status).toEqual(200);
});

test("POST goals / success", async () => {
  const route = createGoalRoute();
  const app = newHonoWithErrorHandling()
    .use(mockAuthMiddleware)
    .route("/", route);
  const client = testClient(app, {
    DB: testDB,
  });

  const res = await client.index.$post({
    json: {
      activityId: "00000000-0000-4000-8000-000000000001",
      dailyTargetQuantity: 10,
      startDate: "2024-01-01",
      description: "Test goal",
    },
  });

  expect(res.status).toEqual(201);
});

test("POST goals / with debtCap and dayTargets", async () => {
  const route = createGoalRoute();
  const app = newHonoWithErrorHandling()
    .use(mockAuthMiddleware)
    .route("/", route);
  const client = testClient(app, {
    DB: testDB,
  });

  const res = await client.index.$post({
    json: {
      activityId: "00000000-0000-4000-8000-000000000001",
      dailyTargetQuantity: 10,
      startDate: "2024-01-01",
      debtCap: 30,
      dayTargets: { "1": 5, "2": 10 },
    },
  });

  expect(res.status).toEqual(201);
  const body = await okJson(res);
  expect(body.debtCap).toBe(30);
  expect(body.dayTargets).toEqual({ "1": 5, "2": 10 });
});

test("GET goals/:id / success", async () => {
  const route = createGoalRoute();
  const app = newHonoWithErrorHandling()
    .use(mockAuthMiddleware)
    .route("/", route);
  const client = testClient(app, {
    DB: testDB,
  });

  const res = await client[":id"].$get({
    param: { id: "00000000-0000-4000-8000-000000000001" },
  });

  // Goal not found in test DB
  expect(res.status).toEqual(404);
});

test("PUT goals/:id / success", async () => {
  const route = createGoalRoute();
  const app = newHonoWithErrorHandling()
    .use(mockAuthMiddleware)
    .route("/", route);
  const client = testClient(app, {
    DB: testDB,
  });

  const res = await client[":id"].$put({
    param: { id: "00000000-0000-4000-8000-000000000001" },
    json: {
      dailyTargetQuantity: 20,
    },
  });

  // Goal not found in test DB
  expect(res.status).toEqual(404);
});

// BUG-5 regression: REST /goals must reflect freeze periods in currentBalance,
// matching the sync path. Freeze days reduce totalTarget (and thus improve balance).
test("GET goals/:id / currentBalance reflects freeze periods", async () => {
  const goalId = "00000000-0000-4000-8000-0000000000a1";
  const activityId = "00000000-0000-4000-8000-000000000001";

  await testDB.insert(schema.activityGoals).values({
    id: goalId,
    userId: TEST_USER_ID,
    activityId,
    dailyTargetQuantity: 10,
    startDate: "2024-01-01",
    endDate: "2024-01-10",
  });

  // Freeze 2024-01-01..2024-01-05 (5 days). 10-day window -> 5 active days.
  await testDB.insert(schema.activityGoalFreezePeriods).values({
    id: "00000000-0000-4000-8000-0000000000b1",
    goalId,
    userId: TEST_USER_ID,
    startDate: "2024-01-01",
    endDate: "2024-01-05",
  });

  const route = createGoalRoute();
  const app = newHonoWithErrorHandling()
    .use(mockAuthMiddleware)
    .route("/", route);
  const client = testClient(app, { DB: testDB });

  const res = await client[":id"].$get({
    param: { id: goalId },
    query: { clientDate: "2024-01-10" },
  });

  expect(res.status).toEqual(200);
  const body = await okJson(res);
  // 5 active days * target 10 = 50 (without the fix it would be 100).
  expect(body.totalTarget).toBe(50);
  expect(body.totalActual).toBe(0);
  expect(body.currentBalance).toBe(-50);
});

test("GET goals / list reflects freeze periods in currentBalance", async () => {
  const goalId = "00000000-0000-4000-8000-0000000000a2";
  const activityId = "00000000-0000-4000-8000-000000000001";

  await testDB.insert(schema.activityGoals).values({
    id: goalId,
    userId: TEST_USER_ID,
    activityId,
    dailyTargetQuantity: 10,
    startDate: "2024-01-01",
    endDate: "2024-01-10",
  });
  await testDB.insert(schema.activityGoalFreezePeriods).values({
    id: "00000000-0000-4000-8000-0000000000b2",
    goalId,
    userId: TEST_USER_ID,
    startDate: "2024-01-01",
    endDate: "2024-01-05",
  });

  const route = createGoalRoute();
  const app = newHonoWithErrorHandling()
    .use(mockAuthMiddleware)
    .route("/", route);
  const client = testClient(app, { DB: testDB });

  const res = await client.index.$get({ query: { clientDate: "2024-01-10" } });

  expect(res.status).toEqual(200);
  const body = await okJson(res);
  const goal = body.goals.find((g) => g.id === goalId);
  expect(goal?.totalTarget).toBe(50);
  expect(goal?.currentBalance).toBe(-50);
});

test("DELETE goals/:id / success", async () => {
  const route = createGoalRoute();
  const app = newHonoWithErrorHandling()
    .use(mockAuthMiddleware)
    .route("/", route);
  const client = testClient(app, {
    DB: testDB,
  });

  const res = await client[":id"].$delete({
    param: { id: "00000000-0000-4000-8000-000000000001" },
  });

  // Goal not found in test DB
  expect(res.status).toEqual(404);
});

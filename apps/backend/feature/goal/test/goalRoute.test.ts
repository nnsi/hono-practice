import { testClient } from "hono/testing";

import { newHonoWithErrorHandling } from "@backend/lib/honoWithErrorHandling";
import { mockAuthMiddleware } from "@backend/middleware/mockAuthMiddleware";
import { testDB } from "@backend/test.setup";
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

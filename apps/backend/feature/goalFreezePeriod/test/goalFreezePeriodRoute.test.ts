import { testClient } from "hono/testing";

import { newHonoWithErrorHandling } from "@backend/lib/honoWithErrorHandling";
import { mockAuthMiddleware } from "@backend/middleware/mockAuthMiddleware";
import { testDB } from "@backend/test.setup";
import { expect, test } from "vitest";

import { createGoalFreezePeriodRoute } from "../goalFreezePeriodRoute";

test("GET freeze-periods / goal not found", async () => {
  const route = createGoalFreezePeriodRoute();
  const app = newHonoWithErrorHandling()
    .use(mockAuthMiddleware)
    .route("/", route);
  const client = testClient(app, {
    DB: testDB,
  });

  const res = await client[":goalId"]["freeze-periods"].$get({
    param: { goalId: "00000000-0000-4000-8000-000000000099" },
  });

  expect(res.status).toEqual(404);
});

test("POST freeze-periods / goal not found", async () => {
  const route = createGoalFreezePeriodRoute();
  const app = newHonoWithErrorHandling()
    .use(mockAuthMiddleware)
    .route("/", route);
  const client = testClient(app, {
    DB: testDB,
  });

  const res = await client[":goalId"]["freeze-periods"].$post({
    param: { goalId: "00000000-0000-4000-8000-000000000099" },
    json: {
      startDate: "2024-06-01",
      endDate: "2024-06-15",
    },
  });

  expect(res.status).toEqual(404);
});

test("PUT freeze-periods/:id / not found", async () => {
  const route = createGoalFreezePeriodRoute();
  const app = newHonoWithErrorHandling()
    .use(mockAuthMiddleware)
    .route("/", route);
  const client = testClient(app, {
    DB: testDB,
  });

  const res = await client[":goalId"]["freeze-periods"][":id"].$put({
    param: {
      goalId: "00000000-0000-4000-8000-000000000099",
      id: "00000000-0000-4000-8000-000000000098",
    },
    json: {
      startDate: "2024-07-01",
    },
  });

  expect(res.status).toEqual(404);
});

test("DELETE freeze-periods/:id / not found", async () => {
  const route = createGoalFreezePeriodRoute();
  const app = newHonoWithErrorHandling()
    .use(mockAuthMiddleware)
    .route("/", route);
  const client = testClient(app, {
    DB: testDB,
  });

  const res = await client[":goalId"]["freeze-periods"][":id"].$delete({
    param: {
      goalId: "00000000-0000-4000-8000-000000000099",
      id: "00000000-0000-4000-8000-000000000098",
    },
  });

  expect(res.status).toEqual(404);
});

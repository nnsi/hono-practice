import { Hono } from "hono";
import { testClient } from "hono/testing";

import { mockAuthMiddleware } from "@backend/middleware/mockAuthMiddleware";
import { testDB } from "@backend/test.setup";
import { expect, test } from "vitest";

import { createSubscriptionRoute } from "..";

test("GET /subscription - returns subscription for authenticated user", async () => {
  const route = createSubscriptionRoute();
  const app = new Hono().use(mockAuthMiddleware).route("/", route);
  const client = testClient(app, {
    DB: testDB,
  });

  const res = await client.index.$get();
  const resJson = await res.json();

  expect(res.status).toEqual(200);
  expect(resJson).toHaveProperty("plan");
  expect(resJson).toHaveProperty("status");
  expect(resJson).toHaveProperty("canUseApiKey");
  expect(resJson).toHaveProperty("trialEnd");
  expect(resJson).toHaveProperty("currentPeriodEnd");
});

test("GET /subscription - returns default free subscription when not found", async () => {
  const route = createSubscriptionRoute();
  const app = new Hono().use(mockAuthMiddleware).route("/", route);
  const client = testClient(app, {
    DB: testDB,
  });

  const res = await client.index.$get();
  const resJson = await res.json();

  expect(res.status).toEqual(200);
  // Default free subscription values
  expect(resJson.plan).toEqual("free");
  expect(resJson.status).toEqual("active");
  expect(resJson.canUseApiKey).toEqual(false);
  expect(resJson.trialEnd).toBeNull();
  expect(resJson.currentPeriodEnd).toBeNull();
});

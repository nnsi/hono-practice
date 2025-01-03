import { Hono } from "hono";
import { testClient } from "hono/testing";

import { expect, test } from "vitest";

import { mockAuthMiddleware } from "@/backend/middleware/mockAuthMiddleware";
import { testDB } from "@/backend/test.setup";

import { createGoalRoute } from "..";

test("GET goals / success", async () => {
  const route = createGoalRoute(testDB);
  const app = new Hono().use(mockAuthMiddleware).route("/", route);
  const client = testClient(app);

  const res = await client.index.$get();

  expect(res.status).toEqual(200);
});

test("GET goals/:id / success", async () => {
  const route = createGoalRoute(testDB);
  const app = new Hono().use(mockAuthMiddleware).route("/", route);
  const client = testClient(app);

  const res = await client[":id"].$get({
    param: {
      id: "00000000-0000-4000-8000-000000000001",
    },
  });

  const json = await res.json();

  expect(res.status).toEqual(200);
  expect(json.id).toEqual("00000000-0000-4000-8000-000000000001");
});

test("POST goals / success", async () => {
  const route = createGoalRoute(testDB);
  const app = new Hono().use(mockAuthMiddleware).route("/", route);
  const client = testClient(app);

  const res = await client.index.$post({
    json: {
      title: "Create-Goal",
      quantity: 100,
      unit: "回",
      currentQuantity: 0,
      startDate: "2026-01-01",
      dueDate: "2031-12-31",
    },
  });

  expect(res.status).toEqual(200);
});

test("PUT goals/:id / success", async () => {
  const route = createGoalRoute(testDB);
  const app = new Hono().use(mockAuthMiddleware).route("/", route);
  const client = testClient(app);

  const res = await client[":id"].$put({
    param: {
      id: "00000000-0000-4000-8000-000000000001",
    },
    json: {
      title: "Update-Goal",
      quantity: 200,
      unit: "回",
      currentQuantity: 0,
      startDate: "2036-01-01",
      dueDate: "2041-12-31",
    },
  });

  expect(res.status).toEqual(200);
});

test("DELETE goals/:id / success", async () => {
  const route = createGoalRoute(testDB);
  const app = new Hono().use(mockAuthMiddleware).route("/", route);
  const client = testClient(app);

  const res = await client[":id"].$delete({
    param: {
      id: "00000000-0000-4000-8000-000000000001",
    },
  });

  expect(res.status).toEqual(204);
});

import { Hono } from "hono";
import { testClient } from "hono/testing";

import { test, expect } from "vitest";

import { mockAuthMiddleware } from "@/backend/middleware/mockAuthMiddleware";
import { testDB } from "@/backend/test.setup";

import { createTaskRoute } from "..";

test("POST tasks / success", async () => {
  const route = createTaskRoute(testDB);
  const app = new Hono().use(mockAuthMiddleware).route("/", route);
  const client = testClient(app);

  const res = await client.index.$post({
    json: {
      title: "test",
    },
  });

  expect(res.status).toEqual(200);
});

test("GET tasks / success", async () => {
  const route = createTaskRoute(testDB);
  const app = new Hono().use(mockAuthMiddleware).route("/", route);
  const client = testClient(app);

  const res = await client.index.$get();

  expect(res.status).toEqual(200);
});

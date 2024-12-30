import { Hono } from "hono";
import { testClient } from "hono/testing";

import { expect, test } from "vitest";

import { ResourceNotFoundError } from "@/backend/error";
import { mockAuthMiddleware } from "@/backend/middleware/mockAuthMiddleware";
import { testDB } from "@/backend/test.setup";

import { createActivityLogRoute } from "..";

test("GET activityLogs / success", async () => {
  const route = createActivityLogRoute(testDB);
  const app = new Hono().use(mockAuthMiddleware).route("/", route);
  const client = testClient(app);

  const res = await client.index.$get();

  expect(res.status).toEqual(200);
});

test("GET activityLogs/:id / success", async () => {
  const route = createActivityLogRoute(testDB);
  const app = new Hono().use(mockAuthMiddleware).route("/", route);
  const client = testClient(app);

  const res = await client[":id"].$get({
    param: {
      id: "00000000-0000-4000-8000-000000000001",
    },
  });

  const resJson = await res.json();

  expect(res.status).toEqual(200);
  expect(resJson.id).toEqual("00000000-0000-4000-8000-000000000001");
});

test("POST activityLogs / success", async () => {
  const route = createActivityLogRoute(testDB);
  const app = new Hono().use(mockAuthMiddleware).route("/", route);
  const client = testClient(app);

  const res = await client.index.$post({
    json: {
      activityId: "00000000-0000-4000-8000-000000000001",
      quantity: 1,
      date: "2021-01-01",
    },
  });

  expect(res.status).toEqual(200);
});

test("PUT activityLogs/:id / success", async () => {
  const route = createActivityLogRoute(testDB);
  const app = new Hono().use(mockAuthMiddleware).route("/", route);
  const client = testClient(app);

  const res = await client[":id"].$put({
    param: {
      id: "00000000-0000-4000-8000-000000000001",
    },
    json: {
      quantity: 2,
    },
  });

  expect(res.status).toEqual(200);
});

test("DELETE activityLogs/:id / success", async () => {
  const route = createActivityLogRoute(testDB);
  const app = new Hono().use(mockAuthMiddleware).route("/", route);
  const client = testClient(app);

  const res = await client[":id"].$delete({
    param: {
      id: "00000000-0000-4000-8000-000000000001",
    },
  });

  expect(res.status).toEqual(200);

  app.onError((err, c) => {
    // TODO: ここでキャッチしなくても良いようにしたい
    if (err instanceof ResourceNotFoundError) {
      return c.json({ message: err.message }, err.status);
    }
    return c.json({ message: "internal server error" }, 500);
  });

  const checkRes = await client[":id"].$get({
    param: {
      id: "00000000-0000-4000-8000-000000000001",
    },
  });

  expect(checkRes.status).toEqual(404);
});

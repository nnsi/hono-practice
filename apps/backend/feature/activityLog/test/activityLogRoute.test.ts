import { Hono } from "hono";
import { testClient } from "hono/testing";

import { newHonoWithErrorHandling } from "@backend/lib/honoWithErrorHandling";
import { mockAuthMiddleware } from "@backend/middleware/mockAuthMiddleware";
import { testDB } from "@backend/test.setup";
import { expect, test } from "vitest";

import { createActivityLogRoute } from "..";

test("GET activityLogs / success", async () => {
  const route = createActivityLogRoute();
  const app = new Hono().use(mockAuthMiddleware).route("/", route);
  const client = testClient(app, {
    DB: testDB,
  });

  const res = await client.index.$get();

  expect(res.status).toEqual(200);
});

test("GET activityLogs/:id / success", async () => {
  const route = createActivityLogRoute();
  const app = new Hono().use(mockAuthMiddleware).route("/", route);
  const client = testClient(app, {
    DB: testDB,
  });

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
  const route = createActivityLogRoute();
  const app = new Hono().use(mockAuthMiddleware).route("/", route);
  const client = testClient(app, {
    DB: testDB,
  });

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
  const route = createActivityLogRoute();
  const app = new Hono().use(mockAuthMiddleware).route("/", route);
  const client = testClient(app, {
    DB: testDB,
  });

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
  const route = createActivityLogRoute();
  const app = newHonoWithErrorHandling()
    .use(mockAuthMiddleware)
    .route("/", route);
  const client = testClient(app, {
    DB: testDB,
  });

  const res = await client[":id"].$delete({
    param: {
      id: "00000000-0000-4000-8000-000000000001",
    },
  });

  const checkRes = await client[":id"].$get({
    param: {
      id: "00000000-0000-4000-8000-000000000001",
    },
  });

  expect(res.status).toEqual(200);
  expect(checkRes.status).toEqual(404);
});

import { Hono } from "hono";
import { testClient } from "hono/testing";

import { newHonoWithErrorHandling } from "@backend/lib/honoWithErrorHandling";
import { mockAuthMiddleware } from "@backend/middleware/mockAuthMiddleware";
import { testDB } from "@backend/setup.test";
import { expect, test } from "vitest";

import { createActivityRoute } from "..";

test("GET activities / success", async () => {
  const route = createActivityRoute();
  const app = new Hono().use(mockAuthMiddleware).route("/", route);
  const client = testClient(app, {
    DB: testDB,
  });

  const res = await client.index.$get();

  const resJson = await res.json();

  expect(res.status).toEqual(200);
  expect(resJson.length).toEqual(3);
});

test("GET activities/:id / success", async () => {
  const route = createActivityRoute();
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
  expect(resJson.name).toEqual("test");
});

test("POST activities / success", async () => {
  const route = createActivityRoute();
  const app = new Hono().use(mockAuthMiddleware).route("/", route);
  const client = testClient(app, {
    DB: testDB,
  });

  const res = await client.index.$post({
    json: {
      name: "test",
      label: "test",
      quantityUnit: "回",
    },
  });

  expect(res.status).toEqual(200);
});

test("PUT activities/:id / success", async () => {
  const route = createActivityRoute();
  const app = new Hono().use(mockAuthMiddleware).route("/", route);
  const client = testClient(app, {
    DB: testDB,
  });

  const res = await client[":id"].$put({
    param: {
      id: "00000000-0000-4000-8000-000000000001",
    },
    json: {
      activity: {
        name: "test",
        quantityUnit: "回",
      },
      options: [],
      kinds: [],
    },
  });

  expect(res.status).toEqual(200);
});

test("DELETE activities/:id / success", async () => {
  const route = createActivityRoute();
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

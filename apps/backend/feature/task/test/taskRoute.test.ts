import { Hono } from "hono";
import { testClient } from "hono/testing";

import { newHonoWithErrorHandling } from "@backend/lib/honoWithErrorHandling";
import { mockAuthMiddleware } from "@backend/middleware/mockAuthMiddleware";
import { testDB } from "@backend/test.setup";
import { expect, test } from "vitest";

import { createTaskRoute } from "..";

test("GET tasks / success", async () => {
  const route = createTaskRoute();
  const app = new Hono().use(mockAuthMiddleware).route("/", route);
  const client = testClient(app, {
    DB: testDB,
  });

  const res = await client.index.$get({ query: {} });

  expect(res.status).toEqual(200);
});

test("GET tasks/:id / success", async () => {
  const route = createTaskRoute();
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
  expect(resJson.title).toEqual("test");
  expect(resJson.doneDate).toEqual(null);
});

test("POST task / success", async () => {
  const route = createTaskRoute();
  const app = new Hono().use(mockAuthMiddleware).route("/", route);
  const client = testClient(app, {
    DB: testDB,
  });

  const res = await client.index.$post({
    json: {
      title: "test",
      startDate: "2021-01-01",
    },
  });

  expect(res.status).toEqual(200);
});

test("PUT tasks/:id / success", async () => {
  const route = createTaskRoute();
  const app = new Hono().use(mockAuthMiddleware).route("/", route);
  const client = testClient(app, {
    DB: testDB,
  });

  const res = await client[":id"].$put({
    param: {
      id: "00000000-0000-4000-8000-000000000001",
    },
    json: {
      title: "update",
      memo: "update",
      doneDate: "2021-01-01",
    },
  });

  const resJson = await res.json();

  expect(res.status).toEqual(200);
  expect(resJson.title).toEqual("update");
  expect(resJson.memo).toEqual("update");
  expect(resJson.doneDate).toEqual("2021-01-01T00:00:00.000Z");
});

test("DELETE tasks/:id / success", async () => {
  const route = createTaskRoute();
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

  expect(res.status).toEqual(200);
});

test("GET tasks / with valid date query", async () => {
  const route = createTaskRoute();
  const app = new Hono().use(mockAuthMiddleware).route("/", route);
  const client = testClient(app, {
    DB: testDB,
  });

  const res = await client.index.$get({ query: { date: "2021-01-01" } });
  expect(res.status).toEqual(200);
});

test("GET tasks / with invalid date query", async () => {
  const route = createTaskRoute();
  const app = new Hono().use(mockAuthMiddleware).route("/", route);
  const client = testClient(app, {
    DB: testDB,
  });

  const res = await client.index.$get({ query: { date: "invalid-date" } });
  expect(res.status).toEqual(400);
});

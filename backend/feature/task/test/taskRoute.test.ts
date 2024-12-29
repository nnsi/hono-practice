import { Hono } from "hono";
import { testClient } from "hono/testing";

import { expect, test } from "vitest";

import { ResourceNotFoundError } from "@/backend/error";
import { mockAuthMiddleware } from "@/backend/middleware/mockAuthMiddleware";
import { testDB } from "@/backend/test.setup";

import { createTaskRoute } from "..";

test("GET tasks / success", async () => {
  const route = createTaskRoute(testDB);
  const app = new Hono().use(mockAuthMiddleware).route("/", route);
  const client = testClient(app);

  const res = await client.index.$get();

  expect(res.status).toEqual(200);
});

test("GET tasks/:id / success", async () => {
  const route = createTaskRoute(testDB);
  const app = new Hono().use(mockAuthMiddleware).route("/", route);
  const client = testClient(app);

  const res = await client[":id"].$get({
    param: {
      id: "00000000-0000-4000-8000-000000000001",
    },
  });

  const resJson = await res.json();

  expect(res.status).toEqual(200);
  expect(resJson.title).toEqual("test");
  expect(resJson.done).toEqual(false);
});

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

test("PUT tasks/:id / success", async () => {
  const route = createTaskRoute(testDB);
  const app = new Hono().use(mockAuthMiddleware).route("/", route);
  const client = testClient(app);

  const res = await client[":id"].$put({
    param: {
      id: "00000000-0000-4000-8000-000000000001",
    },
    json: {
      title: "update",
      memo: "update",
      done: true,
    },
  });

  const resJson = await res.json();

  expect(res.status).toEqual(200);
  expect(resJson.title).toEqual("update");
  expect(resJson.memo).toEqual("update");
  expect(resJson.done).toEqual(true);
});

test("DELETE tasks/:id / success", async () => {
  const route = createTaskRoute(testDB);
  const app = new Hono().use(mockAuthMiddleware).route("/", route);
  const client = testClient(app);

  const res = await client[":id"].$delete({
    param: {
      id: "00000000-0000-4000-8000-000000000001",
    },
  });

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

  expect(res.status).toEqual(200);
  expect(checkRes.status).toEqual(404);
});

import { Hono } from "hono";
import { testClient } from "hono/testing";

import { expect, test } from "vitest";

import { mockAuthMiddleware } from "@/backend/middleware/mockAuthMiddleware";
import { testDB } from "@/backend/test.setup";

import { createActivityRoute } from "..";
import { ResourceNotFoundError } from "@/backend/error";

test("GET activities / success", async () => {
  const route = createActivityRoute(testDB);
  const app = new Hono().use(mockAuthMiddleware).route("/", route);
  const client = testClient(app);

  const res = await client.index.$get();

  const resJson = await res.json();

  expect(res.status).toEqual(200);
  expect(resJson.length).toEqual(3);
});

test("GET activities/:id / success", async () => {
  const route = createActivityRoute(testDB);
  const app = new Hono().use(mockAuthMiddleware).route("/", route);
  const client = testClient(app);

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
  const route = createActivityRoute(testDB);
  const app = new Hono().use(mockAuthMiddleware).route("/", route);
  const client = testClient(app);

  const res = await client.index.$post({
    json: {
      name: "test",
      label: "test",
      quantityLabel: "回",
    },
  });

  expect(res.status).toEqual(200);
});

test("PUT activities/:id / success", async () => {
  const route = createActivityRoute(testDB);
  const app = new Hono().use(mockAuthMiddleware).route("/", route);
  const client = testClient(app);

  const res = await client[":id"].$put({
    param: {
      id: "00000000-0000-4000-8000-000000000001",
    },
    json: {
        activity:{
          name: "test",
          quantityLabel: "回",      
        },
        options:[],
        kinds:[]
    },
  });

  expect(res.status).toEqual(200);
})

test("DELETE activities/:id / success", async () => {
  const route = createActivityRoute(testDB);
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
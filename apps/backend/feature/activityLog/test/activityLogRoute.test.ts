import { Hono } from "hono";
import { testClient } from "hono/testing";

import { newHonoWithErrorHandling } from "@backend/lib/honoWithErrorHandling";
import { mockAuthMiddleware } from "@backend/middleware/mockAuthMiddleware";
import { testDB } from "@backend/test.setup";
import { activities, users } from "@infra/drizzle/schema";
import { expect, test } from "vitest";

import { createActivityLogRoute } from "..";

test("GET activityLogs / success", async () => {
  const route = createActivityLogRoute();
  const app = new Hono().use(mockAuthMiddleware).route("/", route);
  const client = testClient(app, {
    DB: testDB,
  });

  const res = await client.index.$get({ query: { date: "2021-01-01" } });

  expect(res.status).toEqual(200);
});

test("GET activityLogs / date未指定で 400", async () => {
  const route = createActivityLogRoute();
  const app = newHonoWithErrorHandling()
    .use(mockAuthMiddleware)
    .route("/", route);

  const res = await app.request(
    "/",
    { method: "GET" },
    { DB: testDB, NODE_ENV: "test" },
  );

  expect(res.status).toEqual(400);
});

test("GET activityLogs / invalid date で 400", async () => {
  const route = createActivityLogRoute();
  const app = newHonoWithErrorHandling()
    .use(mockAuthMiddleware)
    .route("/", route);

  const res = await app.request(
    "/?date=2026-02-30",
    { method: "GET" },
    { DB: testDB, NODE_ENV: "test" },
  );

  expect(res.status).toEqual(400);
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

  expect(res.status).toEqual(201);
});

test("POST activityLogs / 他人の activityId は 404", async () => {
  const otherUserId = "00000000-0000-4000-8000-00000000ffff";
  const otherActivityId = "00000000-0000-4000-8000-0000000ffff1";
  await testDB
    .insert(users)
    .values({ id: otherUserId, loginId: "other-user", name: "other" });
  await testDB.insert(activities).values({
    id: otherActivityId,
    userId: otherUserId,
    name: "other activity",
    label: "other",
    emoji: "🧪",
    orderIndex: "gaf",
    quantityUnit: "回",
    iconType: "emoji",
  });

  const route = createActivityLogRoute();
  const app = newHonoWithErrorHandling()
    .use(mockAuthMiddleware)
    .route("/", route);

  const res = await app.request(
    "/",
    {
      method: "POST",
      body: JSON.stringify({
        activityId: otherActivityId,
        quantity: 1,
        date: "2021-01-01",
      }),
      headers: { "Content-Type": "application/json" },
    },
    { DB: testDB, NODE_ENV: "test" },
  );

  expect(res.status).toEqual(404);
  expect((await res.json()).message).toEqual("activity not found");
});

test("POST activityLogs / クライアント指定 ID の重複は 409", async () => {
  const route = createActivityLogRoute();
  const app = newHonoWithErrorHandling()
    .use(mockAuthMiddleware)
    .route("/", route);
  const body = JSON.stringify({
    id: "00000000-0000-4000-8000-00000000d0e1",
    activityId: "00000000-0000-4000-8000-000000000001",
    quantity: 1,
    date: "2021-01-01",
  });
  const request = () =>
    app.request(
      "/",
      { method: "POST", body, headers: { "Content-Type": "application/json" } },
      { DB: testDB, NODE_ENV: "test" },
    );

  expect((await request()).status).toEqual(201);
  const res = await request();
  expect(res.status).toEqual(409);
  expect(await res.json()).toEqual({ message: "conflict" });
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
      activityKindId: "00000000-0000-4000-8000-000000000002",
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

  expect(res.status).toEqual(200);
});

test("GET activityLogs/stats / required date 欠落で 400", async () => {
  const route = createActivityLogRoute();
  const app = newHonoWithErrorHandling()
    .use(mockAuthMiddleware)
    .route("/", route);

  const res = await app.request(
    "/stats",
    { method: "GET" },
    { DB: testDB, NODE_ENV: "test" },
  );

  expect(res.status).toEqual(400);
});

test("GET activityLogs/stats / date 指定で 200", async () => {
  const route = createActivityLogRoute();
  const app = newHonoWithErrorHandling()
    .use(mockAuthMiddleware)
    .route("/", route);

  const res = await app.request(
    "/stats?date=2026-04-12",
    { method: "GET" },
    { DB: testDB, NODE_ENV: "test" },
  );

  expect(res.status).toEqual(200);
});

test("POST activityLogs/batch / 同じ id の再送は duplicate、id なしの同一内容は全件作成する", async () => {
  const route = createActivityLogRoute();
  const app = newHonoWithErrorHandling()
    .use(mockAuthMiddleware)
    .route("/", route);
  const env = { DB: testDB, NODE_ENV: "test" };
  const activityId = "00000000-0000-4000-8000-000000000001";
  const id = "10000000-0000-4000-8000-00000000b001";
  const log = { date: "2030-06-01", quantity: 1, memo: "", activityId };
  const post = (activityLogs: unknown[]) =>
    app.request(
      "/batch",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activityLogs }),
      },
      env,
    );

  // 1 タップ = 1 件のバイナリ記録: 内容が同じでも全件作成される
  const first = await post([log, log, { ...log, id }]);
  expect(first.status).toEqual(200);
  const firstJson = await first.json();
  expect(firstJson.summary).toEqual({ total: 3, succeeded: 3, failed: 0 });

  // 同じリクエストの再送: id 付きは duplicate (409 でバッチ全体が落ちない)、id なしは作成
  const second = await post([
    { ...log, id },
    { ...log, id: id.toUpperCase() },
    log,
  ]);
  expect(second.status).toEqual(200);
  const secondJson = await second.json();
  expect(secondJson.summary).toEqual({ total: 3, succeeded: 1, failed: 2 });
  expect(secondJson.results[0]).toMatchObject({
    index: 0,
    success: false,
    error: "Duplicate activity log",
  });
  expect(secondJson.results[1].success).toBe(false);
  expect(secondJson.results[2].success).toBe(true);

  const stored = await app.request("/?date=2030-06-01", { method: "GET" }, env);
  const storedJson = await stored.json();
  expect(storedJson).toHaveLength(4);
});

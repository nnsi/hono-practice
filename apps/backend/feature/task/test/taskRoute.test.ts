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
  expect(resJson.doneDate).toEqual("2021-01-01");
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

test("POST task / タイトルが200文字を超えると400", async () => {
  const route = createTaskRoute();
  const app = new Hono().use(mockAuthMiddleware).route("/", route);
  const client = testClient(app, {
    DB: testDB,
  });

  const res = await client.index.$post({
    json: {
      title: "a".repeat(201),
      startDate: "2021-01-01",
    },
  });

  expect(res.status).toEqual(400);
});

test("POST task / メモが2000文字を超えると400", async () => {
  const route = createTaskRoute();
  const app = new Hono().use(mockAuthMiddleware).route("/", route);
  const client = testClient(app, {
    DB: testDB,
  });

  const res = await client.index.$post({
    json: {
      title: "test",
      startDate: "2021-01-01",
      memo: "a".repeat(2001),
    },
  });

  expect(res.status).toEqual(400);
});

test("POST task / 上限ギリギリ(200文字タイトル)は成功", async () => {
  const route = createTaskRoute();
  const app = new Hono().use(mockAuthMiddleware).route("/", route);
  const client = testClient(app, {
    DB: testDB,
  });

  const res = await client.index.$post({
    json: {
      title: "a".repeat(200),
      startDate: "2021-01-01",
    },
  });

  expect(res.status).toEqual(200);
});

test("GET tasks/archived / success", async () => {
  const route = createTaskRoute();
  const app = new Hono().use(mockAuthMiddleware).route("/", route);
  const client = testClient(app, {
    DB: testDB,
  });

  const res = await client.archived.$get();
  expect(res.status).toEqual(200);

  const resJson = await res.json();
  expect(Array.isArray(resJson)).toBe(true);
});

test("POST tasks/:id/archive / success", async () => {
  const route = createTaskRoute();
  const app = new Hono().use(mockAuthMiddleware).route("/", route);
  const client = testClient(app, {
    DB: testDB,
  });

  // まず新しいタスクを作成
  const createRes = await client.index.$post({
    json: {
      title: "タスクをアーカイブするテスト",
      startDate: "2021-01-01",
    },
  });

  const createdTask = await createRes.json();
  const taskId = createdTask.id;

  // タスクを完了状態にする
  await client[":id"].$put({
    param: { id: taskId },
    json: {
      doneDate: "2021-01-02",
    },
  });

  // タスクをアーカイブ
  const archiveRes = await client[":id"].archive.$post({
    param: {
      id: taskId,
    },
  });

  expect(archiveRes.status).toEqual(200);

  const archivedTask = await archiveRes.json();
  expect(archivedTask.archivedAt).not.toBeNull();

  // アーカイブ済みタスク一覧で確認
  const archivedListRes = await client.archived.$get();
  const archivedList = await archivedListRes.json();

  const found = archivedList.find((task: any) => task.id === taskId);
  expect(found).toBeDefined();
  expect(found?.title).toEqual("タスクをアーカイブするテスト");
});
/*
TODO: zod/v4でz.iso.date()が使えるようになったら追加

test("GET tasks / with invalid date query", async () => {
  const route = createTaskRoute();
  const app = new Hono().use(mockAuthMiddleware).route("/", route);
  const client = testClient(app, {
    DB: testDB,
  });

  const res = await client.index.$get({ query: { date: "invalid-date" } });
  expect(res.status).toEqual(400);
});
*/

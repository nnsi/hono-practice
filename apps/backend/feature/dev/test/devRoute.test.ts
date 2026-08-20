import { Hono } from "hono";
import { testClient } from "hono/testing";

import { newHonoWithErrorHandling } from "@backend/lib/honoWithErrorHandling";
import { TEST_USER_ID, testDB } from "@backend/test.setup";
import { userSubscriptions } from "@infra/drizzle/schema";
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { createDevRoute } from "../devRoute";

const loginId = "test-user"; // test.setup.ts のシード ID と一致

describe("POST /dev/subscription/plan", () => {
  it("test 環境では plan を更新できる", async () => {
    const route = createDevRoute();
    const app = newHonoWithErrorHandling().route("/", route);
    const client = testClient(app, { DB: testDB, NODE_ENV: "test" });

    const res = await client.subscription.plan.$post({
      json: { loginId, plan: "premium" },
    });
    expect(res.status).toEqual(200);

    const row = await testDB.query.userSubscriptions.findFirst({
      where: eq(userSubscriptions.userId, TEST_USER_ID),
    });
    expect(row?.plan).toEqual("premium");
  });

  it("既存 subscription があれば plan を update する", async () => {
    // 事前に free で作っておく
    const route = createDevRoute();
    const app = newHonoWithErrorHandling().route("/", route);
    const client = testClient(app, { DB: testDB, NODE_ENV: "test" });

    await client.subscription.plan.$post({
      json: { loginId, plan: "free" },
    });
    await client.subscription.plan.$post({
      json: { loginId, plan: "premium" },
    });

    const rows = await testDB.query.userSubscriptions.findMany({
      where: eq(userSubscriptions.userId, TEST_USER_ID),
    });
    expect(rows).toHaveLength(1);
    expect(rows[0].plan).toEqual("premium");
  });

  it("production 環境では 404 を返す", async () => {
    const route = createDevRoute();
    const app = new Hono().route("/", route);
    const client = testClient(app, { DB: testDB, NODE_ENV: "production" });

    const res = await client.subscription.plan.$post({
      json: { loginId, plan: "premium" },
    });
    expect(res.status).toEqual(404);
  });

  it("stg 環境でも 404 を返す", async () => {
    const route = createDevRoute();
    const app = new Hono().route("/", route);
    const client = testClient(app, { DB: testDB, NODE_ENV: "stg" });

    const res = await client.subscription.plan.$post({
      json: { loginId, plan: "premium" },
    });
    expect(res.status).toEqual(404);
  });

  it("development 環境かつ非ローカル Origin/Host からは 403", async () => {
    const route = createDevRoute();
    const app = newHonoWithErrorHandling().route("/", route);
    const client = testClient(app, {
      DB: testDB,
      NODE_ENV: "development",
    });

    const res = await client.subscription.plan.$post(
      { json: { loginId, plan: "premium" } },
      {
        headers: {
          Origin: "https://evil.example.com",
          Host: "evil.example.com",
        },
      },
    );
    expect(res.status).toEqual(403);
  });

  it("development 環境でも localhost Origin なら通る", async () => {
    const route = createDevRoute();
    const app = newHonoWithErrorHandling().route("/", route);
    const client = testClient(app, {
      DB: testDB,
      NODE_ENV: "development",
    });

    const res = await client.subscription.plan.$post(
      { json: { loginId, plan: "free" } },
      {
        headers: {
          Origin: "http://localhost:5173",
          Host: "localhost:5173",
        },
      },
    );
    expect(res.status).toEqual(200);
  });

  it("development 環境で Origin なし + private IP Host も通る (RN LAN E2E)", async () => {
    const route = createDevRoute();
    const app = newHonoWithErrorHandling().route("/", route);
    const client = testClient(app, {
      DB: testDB,
      NODE_ENV: "development",
    });

    const res = await client.subscription.plan.$post(
      { json: { loginId, plan: "free" } },
      { headers: { Host: "192.168.1.10:8787" } },
    );
    expect(res.status).toEqual(200);
  });

  it("存在しないユーザーは 404", async () => {
    const route = createDevRoute();
    const app = newHonoWithErrorHandling().route("/", route);
    const client = testClient(app, { DB: testDB, NODE_ENV: "test" });

    const res = await client.subscription.plan.$post({
      json: { loginId: "no-such-user@example.com", plan: "premium" },
    });
    expect(res.status).toEqual(404);
  });
});

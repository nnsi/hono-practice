import { Hono } from "hono";
import { testClient } from "hono/testing";

import type { AppContext } from "@backend/context";
import { newHonoWithErrorHandling } from "@backend/lib/honoWithErrorHandling";
import { mockAuthMiddleware } from "@backend/middleware/mockAuthMiddleware";
import type { RateLimitCounterPort } from "@backend/port/rateLimit";
import { testDB } from "@backend/test.setup";
import { okJson } from "@backend/test-utils/okJson";
import { expect, test, vi } from "vitest";

import { newAIActivityLogGatewayMock } from "../aiActivityLogGatewayMock";
import { createAIActivityLogRoute } from "../aiActivityLogRoute";

function createApp() {
  const route = createAIActivityLogRoute(() => newAIActivityLogGatewayMock());
  return new Hono().use(mockAuthMiddleware).route("/", route);
}

test("POST /from-speech / Activity名にマッチしてログを作成できる", async () => {
  const app = createApp();
  const client = testClient(app, { DB: testDB });

  const res = await client["from-speech"].$post({
    json: { speechText: "30分testした", clientDate: "2026-03-16" },
  });

  expect(res.status).toEqual(201);

  const body = await okJson(res);
  expect(body.activityLog.activity.name).toEqual("test");
  expect(body.activityLog.quantity).toEqual(30);
  expect(body.activityLog.memo).toEqual("30分testした");
  expect(body.interpretation.detectedActivityName).toEqual("test");
  expect(body.interpretation.rawText).toEqual("30分testした");
});

test("POST /from-speech / 数値なしの場合quantity=1になる", async () => {
  const app = createApp();
  const client = testClient(app, { DB: testDB });

  const res = await client["from-speech"].$post({
    json: { speechText: "testした", clientDate: "2026-03-16" },
  });

  expect(res.status).toEqual(201);

  const body = await okJson(res);
  expect(body.activityLog.quantity).toEqual(1);
});

test("POST /from-speech / マッチしない場合は最初のActivityにフォールバック", async () => {
  const app = createApp();
  const client = testClient(app, { DB: testDB });

  const res = await client["from-speech"].$post({
    json: { speechText: "泳いだ", clientDate: "2026-03-16" },
  });

  expect(res.status).toEqual(201);

  const body = await okJson(res);
  expect(body.activityLog.activity.id).toBeDefined();
  expect(body.activityLog.quantity).toEqual(1);
});

test("POST /from-speech / speechTextが空の場合は400", async () => {
  const app = newHonoWithErrorHandling()
    .use(mockAuthMiddleware)
    .route(
      "/",
      createAIActivityLogRoute(() => newAIActivityLogGatewayMock()),
    );
  const client = testClient(app, { DB: testDB });

  const res = await client["from-speech"].$post({
    json: { speechText: "", clientDate: "2026-03-16" },
  });

  expect(res.status).toEqual(400);
});

test("POST /from-speech / clientDate未指定の場合は400", async () => {
  const app = newHonoWithErrorHandling()
    .use(mockAuthMiddleware)
    .route(
      "/",
      createAIActivityLogRoute(() => newAIActivityLogGatewayMock()),
    );
  const client = testClient(app, { DB: testDB });

  const res = await client["from-speech"].$post({
    // @ts-expect-error clientDate は必須。未指定は 400 になることを検証する
    json: { speechText: "testした" },
  });

  expect(res.status).toEqual(400);
});

test("POST /from-speech / カスタムGatewayを注入できる", async () => {
  const customGateway = () => ({
    parseActivityLog: async () => ({
      parsed: {
        activityId: "00000000-0000-4000-8000-000000000001",
        activityKindId: "00000000-0000-4000-8000-000000000001",
        quantity: 42,
        date: "2026-03-16",
        memo: "カスタム",
      },
      interpretation: {
        detectedActivityName: "test",
        detectedKindName: "test-sub",
        rawText: "カスタム入力",
      },
    }),
  });

  const route = createAIActivityLogRoute(customGateway);
  const app = new Hono().use(mockAuthMiddleware).route("/", route);
  const client = testClient(app, { DB: testDB });

  const res = await client["from-speech"].$post({
    json: { speechText: "何でもいい", clientDate: "2026-03-16" },
  });

  expect(res.status).toEqual(201);

  const body = await okJson(res);
  expect(body.activityLog.quantity).toEqual(42);
  expect(body.activityLog.memo).toEqual("カスタム");
});

test("POST /from-speech / envと認証identityをquota reservationへ配線する", async () => {
  const apiKeyId = "00000000-0000-4000-8000-000000000111";
  const consume = vi.fn().mockResolvedValue({
    allowed: true,
    states: [],
    retryAfterMs: 0,
  });
  const store: RateLimitCounterPort = {
    consume,
  };
  const route = createAIActivityLogRoute(() => newAIActivityLogGatewayMock());
  const app = new Hono<AppContext>()
    .use(mockAuthMiddleware)
    .use("*", async (c, next) => {
      c.set("apiKeyId", apiKeyId);
      await next();
    })
    .route("/", route);
  const client = testClient(app, {
    DB: testDB,
    NODE_ENV: "production",
    RATE_LIMIT_STORE: store,
    AI_MODEL: "quota-wiring-model",
    AI_USER_QUOTA_PER_MINUTE: 11,
    AI_USER_QUOTA_PER_DAY: 22,
    AI_USER_QUOTA_PER_MONTH: 33,
    AI_API_KEY_QUOTA_PER_MINUTE: 44,
    AI_API_KEY_QUOTA_PER_DAY: 55,
    AI_API_KEY_QUOTA_PER_MONTH: 66,
  });

  const res = await client["from-speech"].$post({
    json: { speechText: "testした", clientDate: "2026-03-16" },
  });

  expect(res.status).toBe(201);
  expect(consume).toHaveBeenCalledWith({
    partitionKey: "ai:quota:user:00000000-0000-4000-8000-000000000000",
    rules: [
      {
        key: "ai:user:00000000-0000-4000-8000-000000000000:minute",
        limit: 11,
        windowMs: 60_000,
      },
      {
        key: "ai:user:00000000-0000-4000-8000-000000000000:day",
        limit: 22,
        windowMs: 86_400_000,
      },
      {
        key: "ai:user:00000000-0000-4000-8000-000000000000:month",
        limit: 33,
        windowMs: 2_592_000_000,
      },
      {
        key: `ai:api-key:${apiKeyId}:minute`,
        limit: 44,
        windowMs: 60_000,
      },
      {
        key: `ai:api-key:${apiKeyId}:day`,
        limit: 55,
        windowMs: 86_400_000,
      },
      {
        key: `ai:api-key:${apiKeyId}:month`,
        limit: 66,
        windowMs: 2_592_000_000,
      },
    ],
  });
});

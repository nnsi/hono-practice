import { Hono } from "hono";
import { testClient } from "hono/testing";

import { newHonoWithErrorHandling } from "@backend/lib/honoWithErrorHandling";
import { mockAuthMiddleware } from "@backend/middleware/mockAuthMiddleware";
import { testDB } from "@backend/test.setup";
import { expect, test } from "vitest";

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
    json: { speechText: "30分testした" },
  });

  expect(res.status).toEqual(200);

  const body = await res.json();
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
    json: { speechText: "testした" },
  });

  expect(res.status).toEqual(200);

  const body = await res.json();
  expect(body.activityLog.quantity).toEqual(1);
});

test("POST /from-speech / マッチしない場合は最初のActivityにフォールバック", async () => {
  const app = createApp();
  const client = testClient(app, { DB: testDB });

  const res = await client["from-speech"].$post({
    json: { speechText: "泳いだ" },
  });

  expect(res.status).toEqual(200);

  const body = await res.json();
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
    json: { speechText: "" },
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
    json: { speechText: "何でもいい" },
  });

  expect(res.status).toEqual(200);

  const body = await res.json();
  expect(body.activityLog.quantity).toEqual(42);
  expect(body.activityLog.memo).toEqual("カスタム");
});

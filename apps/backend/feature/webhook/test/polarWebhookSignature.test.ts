import { describe, expect, it } from "vitest";

import {
  TEST_SECRET,
  buildTestApp,
  createMockCommandUc,
  createMockQueryUc,
  makePolarPayload,
  sendWebhook,
  signBody,
} from "./polarWebhookTestHelpers";

describe("Polar webhook signature validation", () => {
  it("returns 400 when webhook-id header is missing", async () => {
    const app = buildTestApp(createMockCommandUc(), createMockQueryUc());
    const body = JSON.stringify(makePolarPayload("subscription.created"));
    const res = await app.request(
      "/",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "webhook-timestamp": String(Math.floor(Date.now() / 1000)),
          "webhook-signature": "v1,dGVzdA==",
        },
        body,
      },
      { POLAR_WEBHOOK_SECRET: TEST_SECRET },
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 when webhook-timestamp header is missing", async () => {
    const app = buildTestApp(createMockCommandUc(), createMockQueryUc());
    const body = JSON.stringify(makePolarPayload("subscription.created"));
    const res = await app.request(
      "/",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "webhook-id": "msg_1",
          "webhook-signature": "v1,dGVzdA==",
        },
        body,
      },
      { POLAR_WEBHOOK_SECRET: TEST_SECRET },
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 when webhook-signature header is missing", async () => {
    const app = buildTestApp(createMockCommandUc(), createMockQueryUc());
    const body = JSON.stringify(makePolarPayload("subscription.created"));
    const res = await app.request(
      "/",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "webhook-id": "msg_1",
          "webhook-timestamp": String(Math.floor(Date.now() / 1000)),
        },
        body,
      },
      { POLAR_WEBHOOK_SECRET: TEST_SECRET },
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid signature", async () => {
    const app = buildTestApp(createMockCommandUc(), createMockQueryUc());
    const res = await sendWebhook(
      app,
      makePolarPayload("subscription.created"),
      { "webhook-signature": "v1,aW52YWxpZA==" },
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 when timestamp is too old (replay attack)", async () => {
    const app = buildTestApp(createMockCommandUc(), createMockQueryUc());
    const body = makePolarPayload("subscription.created");
    const bodyStr = JSON.stringify(body);
    const msgId = "msg_replay_test";
    const oldTs = String(Math.floor(Date.now() / 1000) - 301);
    const sig = `v1,${await signBody(msgId, oldTs, bodyStr)}`;

    const res = await app.request(
      "/",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "webhook-id": msgId,
          "webhook-timestamp": oldTs,
          "webhook-signature": sig,
        },
        body: bodyStr,
      },
      { POLAR_WEBHOOK_SECRET: TEST_SECRET },
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid JSON payload (Zod validation failure)", async () => {
    const app = buildTestApp(createMockCommandUc(), createMockQueryUc());
    const res = await sendWebhook(app, {
      type: "subscription.created",
      data: { id: "x" },
    });
    expect(res.status).toBe(400);
  });
});

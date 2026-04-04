import { Hono } from "hono";

import { createUserId } from "@packages/domain/user/userSchema";
import { describe, expect, it, vi } from "vitest";

import type { CheckoutHandler } from "../checkoutHandler";
import { createCheckoutRoute } from "../checkoutRoute";

const APP_URL = "https://app.example.com";
const TEST_USER_ID = createUserId();

function createMockHandler(): CheckoutHandler {
  return {
    createCheckout: vi.fn().mockResolvedValue({
      checkoutUrl: "https://checkout.polar.sh/abc",
    }),
  };
}

function buildTestApp(handler: CheckoutHandler) {
  const app = new Hono();

  app.onError((err: Error & { status?: number }, c) => {
    const status = err.status ?? 500;
    return c.json({ message: err.message }, status as 400 | 500);
  });

  // Inject userId like authMiddleware would
  app.use("*", async (c, next) => {
    // biome-ignore lint/suspicious/noExplicitAny: test context
    (c as any).set("userId", TEST_USER_ID);
    await next();
  });

  // biome-ignore lint/suspicious/noExplicitAny: test env bindings differ from production AppContext
  app.route("/", createCheckoutRoute({ handler }) as Hono<any>);

  return app;
}

function postCheckout(
  app: ReturnType<typeof buildTestApp>,
  body: unknown,
  env: Record<string, string> = { APP_URL },
) {
  return app.request(
    "/",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
    env,
  );
}

describe("POST /checkout", () => {
  it("returns 200 with checkoutUrl on valid request", async () => {
    const handler = createMockHandler();
    const app = buildTestApp(handler);
    const res = await postCheckout(app, {
      successUrl: "https://app.example.com/success",
    });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual({ checkoutUrl: "https://checkout.polar.sh/abc" });
    expect(handler.createCheckout).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: TEST_USER_ID as string,
        successUrl: "https://app.example.com/success",
      }),
    );
  });

  it("returns 400 when successUrl is missing", async () => {
    const app = buildTestApp(createMockHandler());
    const res = await postCheckout(app, {});

    expect(res.status).toBe(400);
  });

  it("returns 400 when successUrl is empty string", async () => {
    const app = buildTestApp(createMockHandler());
    const res = await postCheckout(app, { successUrl: "" });

    expect(res.status).toBe(400);
  });

  it("returns 400 when successUrl is not a valid URL", async () => {
    const app = buildTestApp(createMockHandler());
    const res = await postCheckout(app, { successUrl: "not-a-url" });

    expect(res.status).toBe(400);
  });

  it("returns 400 when successUrl origin does not match APP_URL", async () => {
    const app = buildTestApp(createMockHandler());
    const res = await postCheckout(app, {
      successUrl: "https://evil.example.com/steal",
    });

    expect(res.status).toBe(400);
    const json = (await res.json()) as { message: string };
    expect(json.message).toBe("Invalid successUrl origin");
  });

  it("accepts successUrl matching APP_URL_V2", async () => {
    const handler = createMockHandler();
    const app = buildTestApp(handler);
    const res = await postCheckout(
      app,
      { successUrl: "https://v2.example.com/success" },
      { APP_URL, APP_URL_V2: "https://v2.example.com" },
    );

    expect(res.status).toBe(200);
  });
});

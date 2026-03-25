import { Hono } from "hono";

import type { AppContext } from "@backend/context";
import { AppError } from "@backend/error";

import { newCheckoutHandler } from "./checkoutHandler";

export function createCheckoutRoute() {
  const app = new Hono<AppContext>();

  return app.post("/", async (c) => {
    const polarAccessToken = c.env.POLAR_ACCESS_TOKEN;
    const polarPriceId = c.env.POLAR_PRICE_ID;

    if (!polarAccessToken || !polarPriceId) {
      throw new AppError("Polar checkout is not configured", 503);
    }

    const body = await c.req.json<{ successUrl: string }>();
    if (!body.successUrl) {
      throw new AppError("successUrl is required", 400);
    }

    // Validate successUrl origin to prevent open redirect
    const allowedOrigins = [c.env.APP_URL, c.env.APP_URL_V2].filter(Boolean);
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(body.successUrl);
    } catch {
      throw new AppError("Invalid successUrl", 400);
    }
    const allowedHosts = allowedOrigins.map((o) => new URL(o as string).origin);
    if (!allowedHosts.includes(parsedUrl.origin)) {
      throw new AppError("Invalid successUrl origin", 400);
    }

    const userId = c.get("userId");
    const handler = newCheckoutHandler({ polarAccessToken, polarPriceId });
    const result = await handler.createCheckout({
      userId,
      successUrl: body.successUrl,
    });

    return c.json(result, 200);
  });
}

export const checkoutRoute = createCheckoutRoute();

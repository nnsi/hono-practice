import { Hono } from "hono";

import type { AppContext } from "@backend/context";
import { AppError } from "@backend/error";
import { z } from "zod";

import type { CheckoutHandler } from "./checkoutHandler";
import { newCheckoutHandler } from "./checkoutHandler";

const checkoutBodySchema = z.object({
  successUrl: z.string().min(1),
});

export function createCheckoutRoute(deps?: { handler: CheckoutHandler }) {
  const app = new Hono<AppContext>();

  return app.post("/", async (c) => {
    let handler: CheckoutHandler;
    if (deps) {
      handler = deps.handler;
    } else {
      const polarAccessToken = c.env.POLAR_ACCESS_TOKEN;
      const polarPriceId = c.env.POLAR_PRICE_ID;
      if (!polarAccessToken || !polarPriceId) {
        throw new AppError("Polar checkout is not configured", 503);
      }
      handler = newCheckoutHandler({ polarAccessToken, polarPriceId });
    }

    const parsed = checkoutBodySchema.safeParse(await c.req.json());
    if (!parsed.success) {
      throw new AppError("successUrl is required", 400);
    }
    const body = parsed.data;

    // Validate successUrl origin to prevent open redirect
    const allowedOrigins = [c.env.APP_URL, c.env.APP_URL_V2].filter(Boolean);
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(body.successUrl);
    } catch {
      throw new AppError("Invalid successUrl", 400);
    }
    const allowedHosts = allowedOrigins
      .filter((o): o is string => Boolean(o))
      .map((o) => new URL(o).origin);
    if (!allowedHosts.includes(parsedUrl.origin)) {
      throw new AppError("Invalid successUrl origin", 400);
    }

    const userId = c.get("userId");
    const result = await handler.createCheckout({
      userId,
      successUrl: body.successUrl,
    });

    return c.json(result, 200);
  });
}

export const checkoutRoute = createCheckoutRoute();

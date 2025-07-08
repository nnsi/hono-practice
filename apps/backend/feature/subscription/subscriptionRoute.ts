import { Hono } from "hono";

import { newSubscriptionHandler } from "./subscriptionHandler";
import { newSubscriptionRepository } from "./subscriptionRepository";
import { newSubscriptionUsecase } from "./subscriptionUsecase";

import type { AppContext } from "@backend/context";

export function createSubscriptionRoute() {
  const app = new Hono<
    AppContext & {
      Variables: {
        h: ReturnType<typeof newSubscriptionHandler>;
      };
    }
  >();

  app.use("*", async (c, next) => {
    const db = c.env.DB;

    const repo = newSubscriptionRepository(db);
    const uc = newSubscriptionUsecase(repo);
    const h = newSubscriptionHandler(uc);

    c.set("h", h);

    return next();
  });

  return app.get("/", async (c) => {
    const userId = c.get("userId");
    const res = await c.var.h.getSubscription(userId);
    return c.json(res);
  });
}

export const subscriptionRoute = createSubscriptionRoute();

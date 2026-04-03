import { Hono } from "hono";

import type { AppContext } from "@backend/context";
import { newDrizzleTransactionRunner } from "@backend/infra/rdb/drizzle/drizzleTransaction";
import { noopTracer } from "@backend/lib/tracer";

import { checkoutRoute } from "./checkoutRoute";
import { newSubscriptionHandler } from "./subscriptionHandler";
import { newSubscriptionHistoryRepository } from "./subscriptionHistoryRepository";
import { newSubscriptionRepository } from "./subscriptionRepository";
import { newSubscriptionUsecase } from "./subscriptionUsecase";

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

    const tracer = c.get("tracer") ?? noopTracer;
    const repo = newSubscriptionRepository(db);
    const historyRepo = newSubscriptionHistoryRepository(db);
    const txRunner = newDrizzleTransactionRunner(db);
    const uc = newSubscriptionUsecase(txRunner, repo, historyRepo, tracer);
    const h = newSubscriptionHandler(uc);

    c.set("h", h);

    return next();
  });

  return app
    .get("/", async (c) => {
      const userId = c.get("userId");
      const res = await c.var.h.getSubscription(userId);
      return c.json(res);
    })
    .route("/checkout", checkoutRoute);
}

export const subscriptionRoute = createSubscriptionRoute();

import { Hono } from "hono";

import type { Config } from "@backend/config";
import type { AppContext } from "@backend/context";
import { AppError } from "@backend/error";
import { newAIClient } from "@backend/infra/ai";
import { noopTracer } from "@backend/lib/tracer";
import { zValidator } from "@hono/zod-validator";
import { CreateAIActivityLogRequestSchema } from "@packages/types/request";

import { newActivityRepository } from "../activity";
import { newActivityLogRepository } from "../activityLog";
import type { AIActivityLogGateway } from "./aiActivityLogGateway";
import { newAIActivityLogGateway } from "./aiActivityLogGatewayImpl";
import { newAIActivityLogHandler } from "./aiActivityLogHandler";
import { newAIActivityLogUsageHandler } from "./aiActivityLogUsageHandler";
import { newAIActivityLogUsecase } from "./aiActivityLogUsecase";
import { consumeAIUsageQuota } from "./aiUsageGuard";

type GatewayFactory = (env: Config) => AIActivityLogGateway;

const defaultGatewayFactory: GatewayFactory = (env) => {
  if (!env.OPENROUTER_API_KEY) {
    throw new AppError("OPENROUTER_API_KEY is not configured", 500);
  }
  const client = newAIClient(env.OPENROUTER_API_KEY);
  return newAIActivityLogGateway(client, env.AI_MODEL);
};

export function createAIActivityLogRoute(
  gatewayFactory: GatewayFactory = defaultGatewayFactory,
) {
  const app = new Hono<
    AppContext & {
      Variables: {
        h: ReturnType<typeof newAIActivityLogHandler>;
      };
    }
  >();

  app.use("*", async (c, next) => {
    const db = c.env.DB;
    const tracer = c.get("tracer") ?? noopTracer;

    const activityRepo = newActivityRepository(db);
    const activityLogRepo = newActivityLogRepository(db);
    const gateway = gatewayFactory(c.env);

    const uc = newAIActivityLogUsecase(
      gateway,
      activityRepo,
      activityLogRepo,
      tracer,
    );
    const handler = newAIActivityLogHandler(uc);
    const rateLimitStore = c.env.RATE_LIMIT_STORE;
    const h = newAIActivityLogUsageHandler(handler, {
      consumeQuota: () =>
        consumeAIUsageQuota({
          counterStore: rateLimitStore,
          config: {
            nodeEnv: c.env.NODE_ENV,
            userQuotaPerMinute: c.env.AI_USER_QUOTA_PER_MINUTE,
            userQuotaPerDay: c.env.AI_USER_QUOTA_PER_DAY,
            userQuotaPerMonth: c.env.AI_USER_QUOTA_PER_MONTH,
            apiKeyQuotaPerMinute: c.env.AI_API_KEY_QUOTA_PER_MINUTE,
            apiKeyQuotaPerDay: c.env.AI_API_KEY_QUOTA_PER_DAY,
            apiKeyQuotaPerMonth: c.env.AI_API_KEY_QUOTA_PER_MONTH,
          },
          identity: {
            userId: c.get("userId"),
            apiKeyId: c.get("apiKeyId"),
          },
          logger: c.get("logger"),
        }),
      logger: c.get("logger"),
      userId: c.get("userId"),
      apiKeyId: c.get("apiKeyId") ?? null,
      model: c.env.AI_MODEL,
    });

    c.set("h", h);

    return next();
  });

  return app.post(
    "/from-speech",
    zValidator("json", CreateAIActivityLogRequestSchema),
    async (c) => {
      const params = c.req.valid("json");
      const res = await c.var.h.createActivityLogFromSpeech(
        c.get("userId"),
        params,
      );
      return c.json(res, 201);
    },
  );
}

export const aiActivityLogRoute = createAIActivityLogRoute();

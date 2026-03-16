import { Hono } from "hono";

import type { Config } from "@backend/config";
import type { AppContext } from "@backend/context";
import { AppError } from "@backend/error";
import { newAIClient } from "@backend/infra/ai";
import { noopTracer } from "@backend/lib/tracer";
import { CreateAIActivityLogRequestSchema } from "@packages/types/request";
import { zValidator } from "@hono/zod-validator";

import { newActivityRepository } from "../activity";
import { newActivityLogRepository } from "../activityLog";
import type { AIActivityLogGateway } from "./aiActivityLogGateway";
import { newAIActivityLogGateway } from "./aiActivityLogGatewayImpl";
import { newAIActivityLogHandler } from "./aiActivityLogHandler";
import { newAIActivityLogUsecase } from "./aiActivityLogUsecase";

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
    const h = newAIActivityLogHandler(uc);

    c.set("h", h);

    return next();
  });

  return app.post(
    "/from-speech",
    zValidator("json", CreateAIActivityLogRequestSchema),
    async (c) => {
      const res = await c.var.h.createActivityLogFromSpeech(
        c.get("userId"),
        c.req.valid("json"),
      );

      return c.json(res);
    },
  );
}

export const aiActivityLogRoute = createAIActivityLogRoute();

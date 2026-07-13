import type { ExecutionContext } from "hono";

import type {
  AnalyticsEngineDataset,
  DurableObjectNamespace,
  Hyperdrive,
} from "@cloudflare/workers-types";
import * as schema from "@infra/drizzle/schema";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { app } from "./app";
import { type Config, configSchema } from "./config";
import {
  RateLimitDurableObject,
  newDurableObjectRateLimitStore,
} from "./infra/rateLimit";

export { RateLimitDurableObject };

let sql: ReturnType<typeof postgres> | undefined;
let db: ReturnType<typeof drizzle> | undefined;

type Env = Config & {
  HYPERDRIVE: Hyperdrive;
  RATE_LIMITER?: DurableObjectNamespace;
  WAE_LOGS?: AnalyticsEngineDataset;
  WAE_CLIENT_ERRORS?: AnalyticsEngineDataset;
};

export default {
  async fetch(req: Request, env: Env, ctx: ExecutionContext) {
    // Cloudflare Workers の env はデフォルト値が適用されないため、
    // Zod で parse して Config の default を反映する
    const config = configSchema.parse(env);

    sql = postgres(env.HYPERDRIVE.connectionString, {
      max: 5,
      fetch_types: false,
      idle_timeout: 30,
    });
    db = drizzle(sql, { schema });

    const rateLimitStore = env.RATE_LIMITER
      ? newDurableObjectRateLimitStore(env.RATE_LIMITER)
      : undefined;

    return app.fetch(
      req,
      {
        ...env,
        ...config,
        DB: db,
        RATE_LIMIT_STORE: rateLimitStore,
        WAE_LOGS: env.WAE_LOGS,
        WAE_CLIENT_ERRORS: env.WAE_CLIENT_ERRORS,
      },
      ctx,
    );
  },
};

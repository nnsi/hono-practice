import type { ExecutionContext } from "hono";

import type {
  DurableObjectNamespace,
  Hyperdrive,
} from "@cloudflare/workers-types";
import * as schema from "@infra/drizzle/schema";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { app } from "./app";
import { type Config, configSchema } from "./config";
import { newDurableObjectStore } from "./infra/kv/do";

// Durable Objectをエクスポート
export { KeyValueDO } from "@infra/do/kvs";

let sql: ReturnType<typeof postgres> | undefined;
let db: ReturnType<typeof drizzle> | undefined;

type Env = Config & {
  HYPERDRIVE: Hyperdrive;
  RATE_LIMIT_DO?: DurableObjectNamespace;
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

    // レートリミット用KVStore（DOが設定されている場合のみ有効）
    const rateLimitKv = env.RATE_LIMIT_DO
      ? newDurableObjectStore<{ count: number; windowStart: number }>(
          env.RATE_LIMIT_DO,
        )
      : undefined;

    return app.fetch(
      req,
      { ...env, ...config, DB: db, RATE_LIMIT_KV: rateLimitKv },
      ctx,
    );
  },
};

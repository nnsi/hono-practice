import type { ExecutionContext } from "hono";

import * as schema from "@infra/drizzle/schema";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { app } from "./app";

import { configSchema, type Config } from "./config";
import type { Hyperdrive } from "@cloudflare/workers-types";

let sql: ReturnType<typeof postgres> | undefined;
let db: ReturnType<typeof drizzle> | undefined;

type Env = Config & {
  HYPERDRIVE: Hyperdrive;
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

    //    const pool = new Pool({ connectionString: env.DATABASE_URL });
    //    const db = drizzle({ client: pool, schema: schema });

    return app.fetch(req, { ...env, ...config, DB: db }, ctx);
  },
};

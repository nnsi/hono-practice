import type { ExecutionContext } from "hono";

import * as schema from "@infra/drizzle/schema";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { app } from "./app";

import type { Config } from "./config";
import type { Hyperdrive } from "@cloudflare/workers-types";

let sql: ReturnType<typeof postgres> | undefined;
let db: ReturnType<typeof drizzle> | undefined;

type Env = Config & {
  HYPERDRIVE: Hyperdrive;
};

function getDb(env: Env) {
  if (!db) {
    sql = postgres(env.HYPERDRIVE.connectionString, {
      max: 5,
      fetch_types: false,
      idle_timeout: 30,
    });
    db = drizzle(sql, { schema });
  }
  return { sql: sql!, db: db! };
}

export default {
  async fetch(req: Request, env: Env, ctx: ExecutionContext) {
    //    const pool = new Pool({ connectionString: env.DATABASE_URL });
    //    const db = drizzle({ client: pool, schema: schema });

    const { db } = getDb(env);

    return app.fetch(req, { ...env, DB: db }, ctx);
  },
};

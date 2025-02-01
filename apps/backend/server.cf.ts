import type { ExecutionContext } from "hono";

import * as schema from "@infra/drizzle/schema";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

import { app } from "./app";

import type { Config } from "./config";

export default {
  async fetch(req: Request, env: Config, ctx: ExecutionContext) {
    const sql = neon(env.DATABASE_URL);
    const db = drizzle({ client: sql, schema: schema });

    return app.fetch(req, { ...env, DB: db }, ctx);
  },
};

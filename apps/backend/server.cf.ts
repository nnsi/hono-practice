import type { ExecutionContext } from "hono";

import * as schema from "@infra/drizzle/schema";
import { Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";

import { app } from "./app";

import type { Config } from "./config";

export default {
  async fetch(req: Request, env: Config, ctx: ExecutionContext) {
    const pool = new Pool({ connectionString: env.DATABASE_URL });
    const db = drizzle({ client: pool, schema: schema });

    return app.fetch(req, { ...env, DB: db }, ctx);
  },
};

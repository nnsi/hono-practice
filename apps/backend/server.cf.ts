import type { ExecutionContext } from "hono";

import * as schema from "@infra/drizzle/schema";
import { drizzle } from "drizzle-orm/neon-http";

import { app } from "./app";

import type { Config } from "./config";

export default {
  async fetch(req: Request, env: Config, ctx: ExecutionContext) {
    const db = drizzle(env.DATABASE_URL, { schema });

    return app.fetch(req, { ...env, DB: db }, ctx);
  },
};

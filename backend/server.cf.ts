import type { ExecutionContext } from "hono";

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

import { app } from "./app";
import { type Config, configSchema } from "./config";

export default {
  fetch: (req: Request, env: Config, ctx: ExecutionContext) => {
    const sql = neon(env.DATABASE_URL);
    const db = drizzle({ client: sql });

    configSchema.parse(env);

    const envWithDB = { ...env, DB: db };
    return app.fetch(req, envWithDB, ctx);
  },
};

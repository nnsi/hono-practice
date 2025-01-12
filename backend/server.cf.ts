import type { ExecutionContext } from "hono";

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

import { app } from "./app";

import type { SafeEnvs } from "./config";

export default {
  fetch: (req: Request, env: SafeEnvs, ctx: ExecutionContext) => {
    const sql = neon(env.DATABASE_URL);
    const db = drizzle({ client: sql });

    const envWithDB = { ...env, DB: db };
    return app.fetch(req, envWithDB, ctx);
  },
};

import type { ExecutionContext } from "hono";

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

import { app } from "./app";

import type { Config } from "./config";

export default {
  fetch: (req: Request, env: Config, ctx: ExecutionContext) => {
    try {
      const sql = neon(env.DATABASE_URL);
      const db = drizzle({ client: sql });

      const envWithDB = { ...env, DB: db };
      return app.fetch(req, envWithDB, ctx);
    } catch (e) {
      console.error("Worker initialization error:", e);
      return new Response(e.message);
    }
  },
};

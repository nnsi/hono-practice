import type { ExecutionContext } from "hono";

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

import { app } from "./app";

import type { SafeEnvs } from "./config";

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle({ client: sql });

export default {
  fetch: (req: Request, env: SafeEnvs, ctx: ExecutionContext) => {
    const envWithDB = { ...env, DB: db };
    return app.fetch(req, envWithDB, ctx);
  },
};

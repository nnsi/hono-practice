import { serve } from "@hono/node-server";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";

import * as schema from "@/drizzle/schema";

import { app } from "./app";
import { config } from "./config";

function createInstance() {
  const pool = new pg.Pool({
    connectionString: config.DATABASE_URL,
  });

  return drizzle(pool, { schema });
}

// biome-ignore lint/suspicious/noShadowRestrictedNames: <explanation>
declare const globalThis: {
  drizzleGlobal: ReturnType<typeof createInstance>;
} & typeof global;

const drizzleInstance = globalThis.drizzleGlobal ?? createInstance();

if (config.NODE_ENV !== "production") {
  globalThis.drizzleGlobal = drizzleInstance;
}

const port = config.API_PORT;
console.log(`Server is running on port ${port} / ${config.NODE_ENV}`);

serve({
  fetch: (request) => {
    return app.fetch(request, { ...config, DB: drizzleInstance });
  },
  port,
});

import { serve } from "@hono/node-server";
import dotenv from "dotenv";
import { drizzle } from "drizzle-orm/postgres-js";

import * as schema from "@/drizzle/schema";

import { app } from "./app";
import { configSchema } from "./config";

dotenv.config();

const config = configSchema.parse(process.env);

function createInstance() {
  return drizzle(config.DATABASE_URL, { schema });
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

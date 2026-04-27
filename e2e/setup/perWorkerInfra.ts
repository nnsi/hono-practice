import { app } from "@backend/app";
import { PGlite } from "@electric-sql/pglite";
import { serve } from "@hono/node-server";
import * as schema from "@infra/drizzle/schema";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { type ViteDevServer, createServer } from "vite";

import { seedDevData } from "../../scripts/seedDevData";
import { BACKEND_PORT, FRONTEND_PORT } from "../helpers/config";

const migrationsFolder = "./infra/drizzle/migrations";

let pglite: PGlite | undefined;
let server: ReturnType<typeof serve> | undefined;
let viteServer: ViteDevServer | undefined;
let startupPromise: Promise<void> | undefined;

async function start() {
  pglite = new PGlite();
  const db = drizzle(pglite, { schema });
  await migrate(db, { migrationsFolder });
  await seedDevData(db);

  const testEnv = {
    APP_URL: `http://localhost:${FRONTEND_PORT}`,
    JWT_SECRET: "e2e-test-secret-that-is-at-least-32-chars-long!!",
    JWT_AUDIENCE: "actiko-backend",
    NODE_ENV: "test" as const,
    DATABASE_URL: "unused-pglite-in-memory",
    GOOGLE_OAUTH_CLIENT_ID: "dummy-string",
    STORAGE_TYPE: "local" as const,
    UPLOAD_DIR: "public/uploads",
    DB: db,
    RATE_LIMIT_KV: undefined,
    STRIPE_WEBHOOK_SECRET: "whsec_e2e_test_secret",
    REVENUECAT_WEBHOOK_AUTH_KEY: "rc_e2e_test_key",
  };

  server = serve({
    fetch: (request) => app.fetch(request, testEnv),
    port: BACKEND_PORT,
  });
  await new Promise<void>((resolve) => {
    server!.on("listening", resolve);
  });

  viteServer = await createServer({
    configFile: "./apps/frontend/vite.config.ts",
    root: "./apps/frontend",
    server: {
      port: FRONTEND_PORT,
      host: "127.0.0.1",
      strictPort: true,
      proxy: {
        "^/auth(?:/|$)": `http://localhost:${BACKEND_PORT}`,
        "^/user(?:/|$)": `http://localhost:${BACKEND_PORT}`,
        "^/users(?:/|$)": `http://localhost:${BACKEND_PORT}`,
        "^/api(?:/|$)": `http://localhost:${BACKEND_PORT}`,
        "^/batch$": `http://localhost:${BACKEND_PORT}`,
        "^/contact(?:/|$)": `http://localhost:${BACKEND_PORT}`,
        "^/webhooks(?:/|$)": `http://localhost:${BACKEND_PORT}`,
      },
    },
    define: {
      "import.meta.env.VITE_API_URL": JSON.stringify(
        `http://localhost:${FRONTEND_PORT}`,
      ),
    },
  });
  await viteServer.listen();

  console.log(
    `[e2e worker ${process.env.VITEST_POOL_ID ?? "?"}] backend:${BACKEND_PORT} frontend:${FRONTEND_PORT}`,
  );
}

export function ensureWorkerInfra(): Promise<void> {
  if (!startupPromise) startupPromise = start();
  return startupPromise;
}

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

let pglite: PGlite;
let server: ReturnType<typeof serve>;
let viteServer: ViteDevServer;

export async function setup() {
  // 1. PGlite + drizzle + migrate + seed
  pglite = new PGlite();
  const db = drizzle(pglite, { schema });
  await migrate(db, { migrationsFolder });
  await seedDevData(db);

  // 2. Hono backend on port 3457
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
  };

  server = serve({
    fetch: (request) => {
      return app.fetch(request, testEnv);
    },
    port: BACKEND_PORT,
  });

  await new Promise<void>((resolve) => {
    server.on("listening", resolve);
  });
  console.log(`E2E backend running on port ${BACKEND_PORT}`);

  // 3. Vite frontend on port 5176 with proxy
  viteServer = await createServer({
    configFile: "./apps/frontend/vite.config.ts",
    root: "./apps/frontend",
    server: {
      port: FRONTEND_PORT,
      host: "127.0.0.1",
      proxy: Object.fromEntries(
        ["/auth", "/user", "/users", "/api", "/batch"].map((p) => [
          p,
          `http://localhost:${BACKEND_PORT}`,
        ]),
      ),
    },
    define: {
      // プロキシ経由で同一オリジンにする（"" だと || fallback で 3456 に行く）
      "import.meta.env.VITE_API_URL": JSON.stringify(
        `http://localhost:${FRONTEND_PORT}`,
      ),
    },
  });
  await viteServer.listen();
  console.log(`E2E frontend running on port ${FRONTEND_PORT}`);
}

export async function teardown() {
  await viteServer?.close();
  await new Promise<void>((resolve, reject) => {
    if (!server) return resolve();
    server.close((err) => (err ? reject(err) : resolve()));
  });
  await pglite?.close();
  console.log("E2E servers stopped");
}

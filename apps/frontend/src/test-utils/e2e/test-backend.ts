import app from "@backend/app";
import type { Config } from "@backend/config";
import type { PGlite } from "@electric-sql/pglite";
import { serve } from "@hono/node-server";
import type * as schema from "@infra/drizzle/schema";
import type { drizzle } from "drizzle-orm/pglite";

import { createTestDb } from "./test-db";

let server: any = null; // Use any type to avoid server type issues
let testDb: ReturnType<typeof drizzle<typeof schema>> | null = null;
let pglite: PGlite | null = null;
export async function startTestBackend(port = 3457, frontendPort?: number) {
  // 既存のサーバーがあれば先に終了
  if (server) {
    await stopTestBackend();
  }

  // Create test database
  const { db, pglite: pgliteInstance } = await createTestDb();
  testDb = db;
  pglite = pgliteInstance;

  // Test configuration
  const testConfig: Config = {
    APP_URL: frontendPort
      ? `http://localhost:${frontendPort}`
      : "http://localhost:5176", // フロントエンドのURLに合わせる
    JWT_AUDIENCE: "test-audience",
    JWT_SECRET: "test-jwt-secret-very-secure-key-for-testing",
    NODE_ENV: "test",
    DATABASE_URL: "pglite://memory",
    API_PORT: port,
    GOOGLE_OAUTH_CLIENT_ID: "test-client-id",
    STORAGE_TYPE: "local",
    UPLOAD_DIR: "public/uploads",
  };

  // Start the server
  return new Promise<void>((resolve) => {
    server = serve({
      fetch: (request) => {
        return app.fetch(request, { ...testConfig, DB: testDb! });
      },
      port,
    });

    // Wait a bit for server to start
    setTimeout(() => {
      console.log(`Test backend started on port ${port}`);
      resolve();
    }, 100);
  });
}

export async function stopTestBackend() {
  const cleanup = async () => {
    // Note: lsof/kill -9 でポートを強制終了すると、インプロセスで動作している
    // vitestワーカー自体を殺してしまうため、server.close() のみで終了する

    if (pglite) {
      try {
        await pglite.close();
      } catch (_e) {
        // エラーは無視
      }
    }

    server = null;
    testDb = null;
    pglite = null;
  };

  if (server) {
    return new Promise<void>((resolve) => {
      let closed = false;

      const forceClose = () => {
        if (!closed) {
          closed = true;
          cleanup().then(resolve);
        }
      };

      // 正常終了を試みる
      server.close(() => {
        if (!closed) {
          closed = true;
          console.log("Test backend stopped");
          cleanup().then(resolve);
        }
      });

      // 2秒後に強制終了
      setTimeout(forceClose, 2000);
    });
  }
  await cleanup();
}

export function getTestDb(): ReturnType<typeof drizzle<typeof schema>> {
  if (!testDb) {
    throw new Error("Test database not initialized");
  }
  return testDb;
}

export function getTestApiUrl(port = 3457) {
  return `http://localhost:${port}`;
}

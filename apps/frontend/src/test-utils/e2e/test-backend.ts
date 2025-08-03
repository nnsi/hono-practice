import app from "@backend/app";
import { serve } from "@hono/node-server";

import { createTestDb } from "./test-db";

import type { Config } from "@backend/config";
import type { PGlite } from "@electric-sql/pglite";
import type * as schema from "@infra/drizzle/schema";
import type { drizzle } from "drizzle-orm/pglite";

let server: any = null; // Use any type to avoid server type issues
let testDb: ReturnType<typeof drizzle<typeof schema>> | null = null;
let pglite: PGlite | null = null;
let serverPort: number | null = null;

export async function startTestBackend(port = 3457, frontendPort?: number) {
  // 既存のサーバーがあれば先に終了
  if (server) {
    await stopTestBackend();
  }

  // Create test database
  const { db, pglite: pgliteInstance } = await createTestDb();
  testDb = db;
  pglite = pgliteInstance;
  serverPort = port;

  // Test configuration
  const testConfig: Config = {
    APP_URL: frontendPort
      ? `http://localhost:${frontendPort}`
      : "http://localhost:5176", // フロントエンドのURLに合わせる
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
    // ポートを使用しているプロセスを強制終了
    if (serverPort) {
      try {
        const killCommand =
          process.platform === "win32"
            ? `for /f "tokens=5" %a in ('netstat -aon ^| findstr :${serverPort}') do taskkill /PID %a /F`
            : `lsof -ti:${serverPort} | xargs -r kill -9 2>/dev/null || true`;

        require("node:child_process").execSync(killCommand, {
          stdio: "ignore",
        });
      } catch (e) {
        // エラーは無視
      }
    }

    if (pglite) {
      try {
        await pglite.close();
      } catch (e) {
        // エラーは無視
      }
    }

    server = null;
    testDb = null;
    pglite = null;
    serverPort = null;
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

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

export async function startTestBackend(port = 3457) {
  // Create test database
  const { db, pglite: pgliteInstance } = await createTestDb();
  testDb = db;
  pglite = pgliteInstance;

  // Test configuration
  const testConfig: Config = {
    APP_URL: `http://localhost:${port}`,
    JWT_SECRET: "test-jwt-secret-very-secure-key-for-testing",
    NODE_ENV: "test",
    DATABASE_URL: "pglite://memory",
    API_PORT: port,
    GOOGLE_OAUTH_CLIENT_ID: "test-client-id",
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
  if (server) {
    return new Promise<void>((resolve) => {
      server.close(() => {
        console.log("Test backend stopped");
        resolve();
      });
    });
  }

  if (pglite) {
    await pglite.close();
  }

  server = null;
  testDb = null;
  pglite = null;
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

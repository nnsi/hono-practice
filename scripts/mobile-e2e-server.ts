import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { app } from "@backend/app";
import { PGlite } from "@electric-sql/pglite";
import { serve } from "@hono/node-server";
import * as schema from "@infra/drizzle/schema";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";

import { seedDevData } from "./seedDevData";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");

function loadEnvFile(filePath: string): Record<string, string> {
  if (!fs.existsSync(filePath)) return {};

  return fs
    .readFileSync(filePath, "utf8")
    .split(/\r?\n/)
    .reduce<Record<string, string>>((acc, line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) return acc;

      const separatorIndex = trimmed.indexOf("=");
      if (separatorIndex < 0) return acc;

      const key = trimmed.slice(0, separatorIndex).trim();
      const value = trimmed.slice(separatorIndex + 1).trim();
      if (!key) return acc;

      acc[key] = value;
      return acc;
    }, {});
}

const backendEnv = loadEnvFile(path.join(repoRoot, "apps/backend/.env"));

const migrationsFolder = "./infra/drizzle/migrations";
const apiPort = Number(process.env.API_PORT ?? backendEnv.API_PORT ?? 3457);
const appUrl =
  process.env.APP_URL ?? backendEnv.APP_URL ?? "http://localhost:2540";
const appUrlV2 = process.env.APP_URL_V2 ?? backendEnv.APP_URL_V2 ?? appUrl;

let pglite: PGlite | null = null;
let server: ReturnType<typeof serve> | null = null;

async function closeServer(exitCode = 0) {
  await new Promise<void>((resolve, reject) => {
    if (!server) {
      resolve();
      return;
    }
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });
  await pglite?.close();
  process.exit(exitCode);
}

async function main() {
  pglite = new PGlite();
  const db = drizzle(pglite, { schema });

  await migrate(db, { migrationsFolder });
  await seedDevData(db);

  const testEnv = {
    APP_URL: appUrl,
    APP_URL_V2: appUrlV2,
    JWT_AUDIENCE: "actiko-backend",
    JWT_SECRET:
      process.env.JWT_SECRET ??
      backendEnv.JWT_SECRET ??
      "e2e-test-secret-that-is-at-least-32-chars-long!!",
    JWT_SECRET_ADMIN:
      process.env.JWT_SECRET_ADMIN ?? backendEnv.JWT_SECRET_ADMIN,
    NODE_ENV: "test" as const,
    DATABASE_URL: "unused-pglite-in-memory",
    GOOGLE_OAUTH_CLIENT_ID:
      process.env.GOOGLE_OAUTH_CLIENT_ID ??
      backendEnv.GOOGLE_OAUTH_CLIENT_ID ??
      "dummy-string",
    GOOGLE_OAUTH_CLIENT_ID_ANDROID:
      process.env.GOOGLE_OAUTH_CLIENT_ID_ANDROID ??
      backendEnv.GOOGLE_OAUTH_CLIENT_ID_ANDROID,
    GOOGLE_OAUTH_CLIENT_ID_IOS:
      process.env.GOOGLE_OAUTH_CLIENT_ID_IOS ??
      backendEnv.GOOGLE_OAUTH_CLIENT_ID_IOS,
    GOOGLE_OAUTH_CLIENT_SECRET:
      process.env.GOOGLE_OAUTH_CLIENT_SECRET ??
      backendEnv.GOOGLE_OAUTH_CLIENT_SECRET,
    APPLE_TEAM_ID: process.env.APPLE_TEAM_ID ?? backendEnv.APPLE_TEAM_ID,
    APPLE_KEY_ID: process.env.APPLE_KEY_ID ?? backendEnv.APPLE_KEY_ID,
    APPLE_CLIENT_ID: process.env.APPLE_CLIENT_ID ?? backendEnv.APPLE_CLIENT_ID,
    APPLE_BUNDLE_ID: process.env.APPLE_BUNDLE_ID ?? backendEnv.APPLE_BUNDLE_ID,
    APPLE_PRIVATE_KEY:
      process.env.APPLE_PRIVATE_KEY ?? backendEnv.APPLE_PRIVATE_KEY,
    ADMIN_ALLOWED_EMAILS:
      process.env.ADMIN_ALLOWED_EMAILS ?? backendEnv.ADMIN_ALLOWED_EMAILS,
    CF_WORKERS_TOKEN:
      process.env.CF_WORKERS_TOKEN ?? backendEnv.CF_WORKERS_TOKEN,
    CF_ACCOUNT_ID: process.env.CF_ACCOUNT_ID ?? backendEnv.CF_ACCOUNT_ID,
    STORAGE_TYPE: "local" as const,
    UPLOAD_DIR: "public/uploads",
    DB: db,
    RATE_LIMIT_KV: undefined,
    REDIS_URL: undefined,
    OPENROUTER_API_KEY:
      process.env.OPENROUTER_API_KEY ?? backendEnv.OPENROUTER_API_KEY,
    AI_MODEL: process.env.AI_MODEL ?? backendEnv.AI_MODEL,
    POLAR_WEBHOOK_SECRET:
      process.env.POLAR_WEBHOOK_SECRET ?? backendEnv.POLAR_WEBHOOK_SECRET,
    REVENUECAT_WEBHOOK_AUTH_KEY:
      process.env.REVENUECAT_WEBHOOK_AUTH_KEY ??
      backendEnv.REVENUECAT_WEBHOOK_AUTH_KEY ??
      "rc_e2e_test_key",
    POLAR_ACCESS_TOKEN:
      process.env.POLAR_ACCESS_TOKEN ?? backendEnv.POLAR_ACCESS_TOKEN,
    POLAR_PRICE_ID: process.env.POLAR_PRICE_ID ?? backendEnv.POLAR_PRICE_ID,
  };

  server = serve({
    fetch: (request) => app.fetch(request, testEnv),
    port: apiPort,
  });

  await new Promise<void>((resolve) => {
    server?.on("listening", resolve);
  });

  console.log(`Mobile E2E backend running on http://localhost:${apiPort}`);
  console.log("Login ID: e2e@example.com");
  console.log("Password: password123");
}

main().catch(async (error) => {
  console.error("Failed to start mobile E2E backend", error);
  await closeServer(1);
});

process.on("SIGINT", () => {
  void closeServer(0);
});

process.on("SIGTERM", () => {
  void closeServer(0);
});

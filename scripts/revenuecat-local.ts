import { randomBytes, randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";

import { app } from "@backend/app";
import { configSchema } from "@backend/config";
import { newMemoryRateLimitStore } from "@backend/infra/rateLimit";
import { PGlite } from "@electric-sql/pglite";
import bcrypt from "bcryptjs";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";

import * as schema from "../infra/drizzle/schema";

export async function createRevenueCatLocalLab(options: {
  password: string;
  webhookKey: string;
  revenueCatApiKey?: string;
}) {
  if (options.password.length < 16 || options.webhookKey.length < 32) {
    throw new Error(
      "RC_LAB_PASSWORD requires 16+ characters; REVENUECAT_WEBHOOK_AUTH_KEY requires 32+",
    );
  }
  // Never read DATABASE_URL or a backend .env. This process owns an ephemeral DB.
  const pglite = new PGlite();
  const db = drizzle(pglite, { schema });
  try {
    await migrate(db, {
      migrationsFolder: fileURLToPath(
        new URL("../infra/drizzle/migrations/", import.meta.url),
      ),
    });
    const userId = randomUUID();
    const loginId = "revenuecat-local@example.com";
    await db.insert(schema.users).values({
      id: userId,
      loginId,
      name: "RevenueCat local test",
      password: await bcrypt.hash(options.password, 10),
    });
    const env = {
      ...configSchema.parse({
        NODE_ENV: "development",
        DATABASE_URL: "unused-isolated-pglite",
        APP_URL: "http://localhost:2460",
        APP_URL_V2: "http://localhost:2460",
        JWT_SECRET: randomBytes(32).toString("hex"),
        REVENUECAT_WEBHOOK_AUTH_KEY: options.webhookKey,
        REVENUECAT_API_KEY: options.revenueCatApiKey,
      }),
      DB: db,
      RATE_LIMIT_STORE: newMemoryRateLimitStore(),
    };
    const fetch = (request: Request) => app.fetch(request, env);
    // Only this port may be tunneled. Login, CRUD and admin are never exposed here.
    const webhookFetch = (request: Request) => {
      if (
        request.method !== "POST" ||
        new URL(request.url).pathname !== "/webhooks/revenuecat"
      ) {
        return new Response("Not Found", { status: 404 });
      }
      return fetch(request);
    };
    return {
      fetch,
      webhookFetch,
      db,
      userId,
      loginId,
      close: () => pglite.close(),
    };
  } catch (error) {
    await pglite.close();
    throw error;
  }
}

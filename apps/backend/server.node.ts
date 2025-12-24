import { serve } from "@hono/node-server";
import * as schema from "@infra/drizzle/schema";
import dotenv from "dotenv";
import { drizzle } from "drizzle-orm/postgres-js";
import { createClient } from "redis";

import { app } from "./app";
import { configSchema } from "./config";
import { newRedisStore } from "./infra/kv/redis";

dotenv.config();

const config = configSchema.parse(process.env);

function createInstance() {
  return drizzle(config.DATABASE_URL, { schema });
}

type RedisClient = ReturnType<typeof createClient>;

// biome-ignore lint/suspicious/noShadowRestrictedNames: globalThis拡張のため
declare const globalThis: {
  drizzleGlobal: ReturnType<typeof createInstance>;
  redisGlobal: RedisClient;
} & typeof global;

const drizzleInstance = globalThis.drizzleGlobal ?? createInstance();

if (config.NODE_ENV === "development") {
  globalThis.drizzleGlobal = drizzleInstance;
}

// Redis接続（オプション）
let rateLimitKv:
  | ReturnType<typeof newRedisStore<{ count: number; windowStart: number }>>
  | undefined;

async function initRedis() {
  if (!config.REDIS_URL) {
    console.log("REDIS_URL not set, rate limiting disabled");
    return;
  }

  try {
    const redisClient =
      globalThis.redisGlobal ?? createClient({ url: config.REDIS_URL });

    if (!redisClient.isOpen) {
      await redisClient.connect();
    }

    if (config.NODE_ENV === "development") {
      globalThis.redisGlobal = redisClient;
    }

    rateLimitKv = newRedisStore<{ count: number; windowStart: number }>(
      redisClient,
    );
    console.log("Redis connected for rate limiting");
  } catch (error) {
    console.error("Failed to connect to Redis:", error);
  }
}

async function main() {
  await initRedis();

  const port = config.API_PORT;
  console.log(`Server is running on port ${port} / ${config.NODE_ENV}`);

  serve({
    fetch: (request) => {
      return app.fetch(request, {
        ...config,
        DB: drizzleInstance,
        RATE_LIMIT_KV: rateLimitKv,
      });
    },
    port,
  });
}

main();

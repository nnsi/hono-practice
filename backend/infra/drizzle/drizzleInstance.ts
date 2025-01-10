import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";

import { config } from "@/backend/config";
import * as schema from "@/drizzle/schema";

import type { drizzle as pglite } from "drizzle-orm/pglite";

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

export type DrizzleInstance =
  | ReturnType<typeof drizzle<typeof schema>>
  | ReturnType<typeof pglite<typeof schema>>; // テスト用

export { drizzleInstance as drizzle };

export type QueryExecutor = Pick<
  DrizzleInstance,
  "query" | "select" | "insert" | "update" | "delete" | "transaction"
>;

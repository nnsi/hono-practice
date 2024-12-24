import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";

import * as schema from "@/drizzle/schema";

const { Pool } = pg;

function createInstance() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  return drizzle(pool, { schema });
}

declare const globalThis: {
  drizzleGlobal: ReturnType<typeof createInstance>;
} & typeof global;

const drizzleInstance = globalThis.drizzleGlobal ?? createInstance();

if (process.env.NODE_ENV !== "production") {
  globalThis.drizzleGlobal = drizzleInstance;
}

export type DrizzleInstance = ReturnType<typeof createInstance>;

export { drizzleInstance as drizzle };

export type QueryExecutor = Pick<
  DrizzleInstance,
  "query" | "select" | "insert" | "update" | "delete" | "transaction"
>;

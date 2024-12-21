import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";

import * as schema from "@/drizzle/schema";

const { Pool } = pg;

function createInstance() {
  return drizzle(pool, { schema });
}

declare const globalThis: {
  drizzleGlobal: ReturnType<typeof createInstance>;
} & typeof global;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const drizzleInstance = globalThis.drizzleGlobal ?? createInstance();

if (process.env.NODE_ENV !== "production") {
  globalThis.drizzleGlobal = drizzleInstance;
}

export type DrizzleInstance = ReturnType<typeof createInstance>;
export type QueryExecutor = Pick<
  DrizzleInstance,
  "query" | "select" | "insert" | "update" | "delete" | "execute"
>;

export { drizzleInstance as drizzle };

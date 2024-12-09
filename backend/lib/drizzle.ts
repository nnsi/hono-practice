import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";

const { Pool } = pg;

declare const globalThis: {
  drizzleGlobal: ReturnType<typeof drizzle>;
} & typeof global;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const drizzleInstance = globalThis.drizzleGlobal ?? drizzle(pool);

if (process.env.NODE_ENV !== "production") {
  globalThis.drizzleGlobal = drizzleInstance;
}

export { drizzleInstance as drizzle };
export type DBClient = typeof drizzleInstance;
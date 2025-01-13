import type * as schema from "@/drizzle/schema";

import type { drizzle as drizzleNeon } from "drizzle-orm/neon-http";
import type { drizzle } from "drizzle-orm/pglite";

export type DrizzleInstance =
  | ReturnType<typeof drizzle<typeof schema>>
  | ReturnType<typeof drizzleNeon<typeof schema>>;

export type QueryExecutor = Pick<
  DrizzleInstance,
  "query" | "select" | "insert" | "update" | "delete" | "transaction"
>;

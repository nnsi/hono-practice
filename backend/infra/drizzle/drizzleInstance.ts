import type * as schema from "@/drizzle/schema";

import type { drizzle } from "drizzle-orm/pglite";

export type DrizzleInstance = ReturnType<typeof drizzle<typeof schema>>;

export type QueryExecutor = Pick<
  DrizzleInstance,
  "query" | "select" | "insert" | "update" | "delete" | "transaction"
>;

import type * as schema from "@/drizzle/schema";

import type { drizzle } from "drizzle-orm/node-postgres";
import type { drizzle as pglite } from "drizzle-orm/pglite";

export type DrizzleInstance =
  | ReturnType<typeof drizzle<typeof schema>>
  | ReturnType<typeof pglite<typeof schema>>; // テスト用

export type QueryExecutor = Pick<
  DrizzleInstance,
  "query" | "select" | "insert" | "update" | "delete" | "transaction"
>;

import { NodePgDatabase } from "drizzle-orm/node-postgres";

import * as schema from "@/drizzle/schema";

export type QueryExecutor = Pick<
  NodePgDatabase<typeof schema>,
  "query" | "select" | "insert" | "update" | "delete" | "transaction"
>;

export type TransactionScope = <T>(
  operation: (txDb: any) => Promise<T>
) => Promise<T>;

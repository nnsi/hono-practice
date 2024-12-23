import { NodePgDatabase } from "drizzle-orm/node-postgres";

import * as schema from "@/drizzle/schema";

export type QueryExecutor = Pick<
  NodePgDatabase<typeof schema>,
  "query" | "select" | "insert" | "update" | "delete" | "transaction"
>;

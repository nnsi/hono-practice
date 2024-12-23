import { QueryExecutor } from "../db";

import { drizzle } from "./drizzleInstance";

export async function runInTx<T>(
  operation: (txDb: QueryExecutor) => Promise<T>
): Promise<T> {
  return drizzle.transaction(async (txDb) => {
    return operation(txDb);
  });
}

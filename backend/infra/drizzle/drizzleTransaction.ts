import { TransactionRunner } from "../db";

import { drizzle, QueryExecutor } from "./drizzleInstance";

export async function runInTx<T>(
  operation: (txDb: QueryExecutor) => Promise<T>
): Promise<T> {
  return drizzle.transaction(async (txDb) => {
    return operation(txDb);
  });
}

export function newDrizzleTransactionRunner(
  db: QueryExecutor
): TransactionRunner {
  return {
    async run(repositories, operation) {
      return db.transaction(async (txDb) => {
        const txRepoArray = repositories.map((repo) => {
          const cloned = { ...repo };
          if ((cloned as any).db) {
            (cloned as any).db = txDb;
          }
          return cloned;
        });
        const mergedTxRepos = Object.assign({}, ...txRepoArray);

        return operation(mergedTxRepos);
      });
    },
  };
}

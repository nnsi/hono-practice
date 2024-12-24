import { type TransactionRunner } from "../db";

import { type QueryExecutor } from "./drizzleInstance";

export function newDrizzleTransactionRunner(
  db: QueryExecutor
): TransactionRunner {
  return {
    async run(repositories, operation) {
      return db.transaction(async (txDb) => {
        const txRepoArray = repositories.map((repo) => repo.withTx(txDb));
        const mergedTxRepos = Object.assign({}, ...txRepoArray);

        return await operation(mergedTxRepos);
      });
    },
  };
}

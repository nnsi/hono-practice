import type { QueryExecutor } from "./drizzleInstance";
import type { TransactionRunner } from "../db";

export function newDrizzleTransactionRunner(
  db: QueryExecutor,
): TransactionRunner {
  if (db.transaction) {
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

  // NOTE:db.transactionがサポートされてない場合は非トランザクションで実行
  return {
    async run(repositories, operation) {
      return (async () => {
        const repoArray = repositories.map((repo) => repo.withTx(db));
        const mergedRepos = Object.assign({}, ...repoArray);

        return await operation(mergedRepos);
      })();
    },
  };
}

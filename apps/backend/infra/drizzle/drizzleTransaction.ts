import type { TransactionRunner } from "../db";
import type { QueryExecutor } from "./drizzleInstance";

export function newDrizzleTransactionRunner(
  db: QueryExecutor,
): TransactionRunner {
  try {
    return {
      async run(repositories, operation) {
        return db.transaction(async (txDb) => {
          const txRepoArray = repositories.map((repo) => repo.withTx(txDb));
          const mergedTxRepos = Object.assign({}, ...txRepoArray);

          return await operation(mergedTxRepos);
        });
      },
    };
  } catch (e) {
    // NOTE:db.transactionがサポートされてない場合は非トランザクションで実行
    return {
      async run(repositories, operation) {
        return (async () => {
          const dbRepoArray = repositories.map((repo) => repo.withTx(db));
          const mergedTxRepos = Object.assign({}, ...dbRepoArray);

          return await operation(mergedTxRepos);
        })();
      },
    };
  }
}

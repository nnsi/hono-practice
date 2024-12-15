import { type DrizzleClient } from "../lib/drizzle";

import { TransactionPort } from "./transactionPort";

export function newDrizzleTransactionAdapter(
  db: DrizzleClient
): TransactionPort {
  return {
    transaction: async (fn) => {
      return db.transaction(fn);
    },
  };
}

import { type DrizzleInstance } from "../lib/drizzle";

import { TransactionPort } from "./transactionPort";

export function newDrizzleTransactionAdapter(
  db: DrizzleInstance
): TransactionPort {
  return {
    transaction: async (fn) => {
      return db.transaction(fn);
    },
  };
}

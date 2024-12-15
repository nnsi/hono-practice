export type TransactionPort = {
  transaction<T>(fn: () => Promise<T>): Promise<T>;
};

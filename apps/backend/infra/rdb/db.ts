type Repository = {
  withTx: <T>(tx: T) => Repository;
  [key: string]: unknown;
};

type UnionToIntersection<U> = (
  U extends unknown
    ? (k: U) => void
    : never
) extends (k: infer I) => void
  ? I
  : never;

export type TransactionRunner = {
  run<T, R extends Repository[]>(
    repositories: R,
    operation: (txRepos: UnionToIntersection<R[number]>) => Promise<T>,
  ): Promise<T>;
};

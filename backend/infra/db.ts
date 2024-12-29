type Repository = {
  withTx: (tx: any) => Repository;
  [key: string]: any;
};

type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (
  k: infer I,
) => void
  ? I
  : never;

export type TransactionRunner = {
  run<T, R extends Repository[]>(
    repositories: R,
    operation: (txRepos: UnionToIntersection<R[number]>) => Promise<T>,
  ): Promise<T>;
};

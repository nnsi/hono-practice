export type KeyValueStore<T> = {
  get: (key: string) => Promise<T | undefined>;
  set(key: string, value: T, ttlSeconds?: number): Promise<void>;
  delete: (key: string) => Promise<void>;
};

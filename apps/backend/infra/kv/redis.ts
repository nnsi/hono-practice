import type { createClient } from "redis";

import type { KeyValueStore } from "./kv";

type RedisClient = ReturnType<typeof createClient>;

export function newRedisStore<T>(redisClient: RedisClient): KeyValueStore<T> {
  return {
    get: async (key: string) => {
      const raw = await redisClient.get(key);
      try {
        return raw ? (JSON.parse(raw) as T) : undefined;
      } catch (_error) {
        await redisClient.del(key);
        return undefined;
      }
    },
    set: async (key, value, ttl) => {
      const payload = JSON.stringify(value);

      await redisClient.set(
        key,
        payload,
        ttl
          ? {
              EX: Math.ceil(ttl),
            }
          : undefined,
      );
    },
    delete: async (key) => {
      await redisClient.del(key);
    },
  };
}

import type { KeyValueStore } from "./kv";
import type { RedisClientType } from "redis";

export function newRedisStore<T>(
  redisClient: RedisClientType,
): KeyValueStore<T> {
  return {
    get: async (key: string) => {
      const raw = await redisClient.get(key);
      try {
        return raw ? (JSON.parse(raw) as T) : undefined;
      } catch (error) {
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

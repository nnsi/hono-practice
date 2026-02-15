import type { KVNamespace } from "@cloudflare/workers-types";

import type { KeyValueStore } from "./kv";

export function newCfKvStore<T>(ns: KVNamespace): KeyValueStore<T> {
  return {
    async get(key) {
      const raw = await ns.get(key);
      if (raw === null) return undefined;
      return JSON.parse(raw) as T;
    },
    async set(key, value, ttlSeconds) {
      await ns.put(key, JSON.stringify(value), {
        expirationTtl: ttlSeconds,
      });
    },
    async delete(key) {
      await ns.delete(key);
    },
  };
}

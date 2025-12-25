import type { DurableObjectNamespace } from "@cloudflare/workers-types";

import type { KeyValueStore } from "./kv";

// DO stubのfetchには完全なURLが必要
const BASE_URL = "http://do";

// 単一DOインスタンスのID
const SINGLETON_ID = "kvs";

export function newDurableObjectStore<T>(
  ns: DurableObjectNamespace,
): KeyValueStore<T> {
  // 単一のDOインスタンスを使用
  const stub = ns.get(ns.idFromName(SINGLETON_ID));

  return {
    async get(k) {
      const res = await stub.fetch(
        `${BASE_URL}/get?key=${encodeURIComponent(k)}`,
      );
      if (res.status === 404) return undefined;
      if (!res.ok) throw new Error(`GET failed ${res.status}`);

      return (await res.json()) as T;
    },
    async set(k, v, ttl) {
      const res = await stub.fetch(`${BASE_URL}/set`, {
        method: "POST",
        body: JSON.stringify({ key: k, value: v, ttl }),
      });
      if (!res.ok) throw new Error(`SET failed ${res.status}`);
    },
    async delete(k) {
      const res = await stub.fetch(
        `${BASE_URL}/delete?key=${encodeURIComponent(k)}`,
        { method: "DELETE" },
      );
      if (!res.ok) throw new Error(`DEL failed ${res.status}`);
    },
  };
}

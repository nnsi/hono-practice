import type { DurableObjectNamespace } from "@cloudflare/workers-types";

import type { KeyValueStore } from "./kv";

// DO stubのfetchには完全なURLが必要
const BASE_URL = "http://do";

export function newDurableObjectStore<T>(
  ns: DurableObjectNamespace,
): KeyValueStore<T> {
  const stubFor = (k: string) => ns.get(ns.idFromName(k));

  return {
    async get(k) {
      const res = await stubFor(k).fetch(`${BASE_URL}/get`);
      if (res.status === 404) return undefined;
      if (!res.ok) throw new Error(`GET failed ${res.status}`);

      return (await res.json()) as T;
    },
    async set(k, v, ttl) {
      const res = await stubFor(k).fetch(`${BASE_URL}/set`, {
        method: "POST",
        body: JSON.stringify({ value: v, ttl }),
      });
      if (!res.ok) throw new Error(`SET failed ${res.status}`);
    },
    async delete(k) {
      const res = await stubFor(k).fetch(`${BASE_URL}/delete`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error(`DEL failed ${res.status}`);
    },
  };
}

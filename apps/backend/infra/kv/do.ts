import type { KeyValueStore } from "./kv";
import type { DurableObjectNamespace } from "@cloudflare/workers-types";

export function newDurableObjectStore<T>(
  ns: DurableObjectNamespace,
): KeyValueStore<T> {
  const stubFor = (k: string) => ns.get(ns.idFromName(k));

  return {
    async get(k) {
      const res = await stubFor(k).fetch("/get");
      if (res.status === 404) return undefined;
      if (!res.ok) throw new Error(`GET failed ${res.status}`);

      return (await res.json()) as T;
    },
    async set(k, v, ttl) {
      const res = await stubFor(k).fetch("/set", {
        method: "POST",
        body: JSON.stringify({ value: v, ttl }),
      });
      if (!res.ok) throw new Error(`SET failed ${res.status}`);
    },
    async delete(k) {
      const res = await stubFor(k).fetch("/delete", { method: "DELETE" });
      if (!res.ok) throw new Error(`DEL failed ${res.status}`);
    },
  };
}

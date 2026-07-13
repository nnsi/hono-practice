import { hc } from "hono/client";

// biome-ignore lint/style/noRestrictedImports: Hono adapter boundary intentionally depends on AppType.
import type { AppType } from "@backend/app";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3456";

let onUnauthorized: (() => void) | null = null;

export function setOnUnauthorized(fn: (() => void) | null) {
  onUnauthorized = fn;
}

const customFetch: typeof fetch = async (input, init) => {
  const res = await fetch(input, { ...init, credentials: "include" });

  if (res.status === 401) {
    onUnauthorized?.();
  }

  return res;
};

export const adminClient = hc<AppType>(API_URL, { fetch: customFetch });

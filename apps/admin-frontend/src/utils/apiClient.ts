import { hc } from "hono/client";

// biome-ignore lint/style/noRestrictedImports: Hono adapter boundary intentionally depends on AppType.
import type { AppType } from "@backend/app";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3456";

let token: string | null = null;
let onUnauthorized: (() => void) | null = null;

export function setAdminToken(t: string | null) {
  token = t;
}

export function getAdminToken(): string | null {
  return token;
}

export function setOnUnauthorized(fn: () => void) {
  onUnauthorized = fn;
}

const customFetch: typeof fetch = async (input, init) => {
  const headers = new Headers(init?.headers);
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const res = await fetch(input, { ...init, headers });

  if (res.status === 401) {
    setAdminToken(null);
    sessionStorage.removeItem("admin_token");
    sessionStorage.removeItem("admin_user");
    onUnauthorized?.();
  }

  return res;
};

export const adminClient = hc<AppType>(API_URL, { fetch: customFetch });

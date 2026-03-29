import { hc } from "hono/client";

import type { AppType } from "@packages/types/api";

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
    localStorage.removeItem("admin_token");
    localStorage.removeItem("admin_user");
    onUnauthorized?.();
  }

  return res;
};

export const adminClient = hc<AppType>(API_URL, { fetch: customFetch });

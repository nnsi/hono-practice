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

export async function adminFetch(
  path: string,
  options: RequestInit = {},
): Promise<Response> {
  const headers = new Headers(options.headers);
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  headers.set("Content-Type", "application/json");

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });

  if (res.status === 401) {
    setAdminToken(null);
    localStorage.removeItem("admin_token");
    localStorage.removeItem("admin_user");
    onUnauthorized?.();
  }

  return res;
}

async function parseJsonResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    throw new Error(`API error: ${res.status}`);
  }
  // Response.json() returns Promise<unknown> at runtime.
  // Callers are responsible for passing the correct generic T
  // matching the server's response shape.
  const data: T = await res.json();
  return data;
}

export async function adminGet<T>(path: string): Promise<T> {
  const res = await adminFetch(path);
  return parseJsonResponse<T>(res);
}

export async function adminPost<T>(path: string, body: unknown): Promise<T> {
  const res = await adminFetch(path, {
    method: "POST",
    body: JSON.stringify(body),
  });
  return parseJsonResponse<T>(res);
}

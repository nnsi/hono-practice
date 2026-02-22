const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3456";

let accessToken: string | null = null;

function getToken(): string | null {
  return accessToken;
}

export function setToken(token: string) {
  accessToken = token;
}

export function clearToken() {
  accessToken = null;
}

async function refreshAccessToken(): Promise<string | null> {
  const res = await fetch(`${API_URL}/auth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });
  if (!res.ok) return null;
  const data = await res.json();
  setToken(data.token);
  return data.token;
}

export async function apiFetch(
  path: string,
  options: RequestInit = {},
): Promise<Response> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const url = path.startsWith("http") ? path : `${API_URL}${path}`;

  let res = await fetch(url, {
    ...options,
    headers,
    credentials: url.includes("/auth/") ? "include" : "omit",
  });

  // 401 → トークンリフレッシュ → 1回リトライ
  if (res.status === 401) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      headers.Authorization = `Bearer ${newToken}`;
      res = await fetch(url, {
        ...options,
        headers,
        credentials: url.includes("/auth/") ? "include" : "omit",
      });
    }
  }

  return res;
}

export async function apiLogin(loginId: string, password: string) {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ login_id: loginId, password }),
  });
  if (!res.ok) {
    throw new Error("Login failed");
  }
  const data = await res.json();
  setToken(data.token);
  return data;
}

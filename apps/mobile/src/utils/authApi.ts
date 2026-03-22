import {
  clearRefreshToken,
  clearToken,
  customFetch,
  getApiUrl,
  setRefreshToken,
  setToken,
} from "./apiClient";

const API_URL = getApiUrl();

const REQUEST_TIMEOUT_MS = 15_000;

function fetchWithTimeout(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  const controller = new AbortController();
  const existingSignal = init?.signal;
  if (existingSignal) {
    existingSignal.addEventListener("abort", () => controller.abort());
  }
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  return fetch(input, { ...init, signal: controller.signal }).finally(() =>
    clearTimeout(timeoutId),
  );
}

export async function apiLogin(loginId: string, password: string) {
  let res: Response;
  try {
    res = await fetchWithTimeout(`${API_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ login_id: loginId, password }),
    });
  } catch {
    throw new Error("ネットワークに接続できません。接続を確認してください");
  }
  if (!res.ok) {
    if (res.status === 401)
      throw new Error("IDまたはパスワードが正しくありません");
    if (res.status >= 500)
      throw new Error(
        "サーバーエラーが発生しました。しばらく経ってからお試しください",
      );
    throw new Error("ログインに失敗しました");
  }
  const data = await res.json();
  setToken(data.token);
  if (data.refreshToken) await setRefreshToken(data.refreshToken);
  return data;
}

export async function apiRegister(loginId: string, password: string) {
  let res: Response;
  try {
    res = await fetchWithTimeout(`${API_URL}/user`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ loginId, password }),
    });
  } catch {
    throw new Error("ネットワークに接続できません。接続を確認してください");
  }
  if (!res.ok) {
    if (res.status >= 500)
      throw new Error(
        "サーバーエラーが発生しました。しばらく経ってからお試しください",
      );
    throw new Error("登録に失敗しました");
  }
  const data = await res.json();
  setToken(data.token);
  if (data.refreshToken) await setRefreshToken(data.refreshToken);
  return data;
}

export async function apiGetMe() {
  const res = await customFetch(`${API_URL}/user/me`);
  if (!res.ok) throw new Error("Failed to fetch user");
  return res.json();
}

export async function apiLogout() {
  try {
    await customFetch(`${API_URL}/auth/logout`, { method: "POST" });
  } catch {
    // Ignore logout errors - clear local state regardless
  }
  clearToken();
  await clearRefreshToken();
}

export async function apiGoogleLogin(credential: string) {
  let res: Response;
  try {
    res = await fetchWithTimeout(`${API_URL}/auth/google`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ credential }),
    });
  } catch {
    throw new Error("ネットワークに接続できません。接続を確認してください");
  }
  if (!res.ok) {
    if (res.status >= 500)
      throw new Error(
        "サーバーエラーが発生しました。しばらく経ってからお試しください",
      );
    throw new Error("Googleログインに失敗しました");
  }
  const data = await res.json();
  setToken(data.token);
  if (data.refreshToken) await setRefreshToken(data.refreshToken);
  return data;
}

export async function apiAppleLogin(credential: string) {
  let res: Response;
  try {
    res = await fetchWithTimeout(`${API_URL}/auth/apple`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ credential }),
    });
  } catch {
    throw new Error("ネットワークに接続できません。接続を確認してください");
  }
  if (!res.ok) {
    if (res.status >= 500)
      throw new Error(
        "サーバーエラーが発生しました。しばらく経ってからお試しください",
      );
    throw new Error("Appleログインに失敗しました");
  }
  const data = await res.json();
  setToken(data.token);
  if (data.refreshToken) await setRefreshToken(data.refreshToken);
  return data;
}

export async function apiAppleLink(credential: string) {
  const res = await customFetch(`${API_URL}/auth/apple/link`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ credential }),
  });
  if (!res.ok) {
    if (res.status === 409)
      throw new Error("このAppleアカウントは別のユーザーに連携済みです");
    throw new Error("Apple連携に失敗しました");
  }
}

export async function apiGoogleLink(credential: string) {
  const res = await customFetch(`${API_URL}/auth/google/link`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ credential }),
  });
  if (!res.ok) {
    if (res.status === 409)
      throw new Error("このGoogleアカウントは別のユーザーに連携済みです");
    throw new Error("Google連携に失敗しました");
  }
}

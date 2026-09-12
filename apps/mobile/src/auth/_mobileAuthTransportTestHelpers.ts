// mobileAuthTransport.*.test.ts 共通ヘルパー
// vi.mock("expo-secure-store") / vi.mock("react-native") は各 test file の先頭で行う
import type { AuthSession } from "@packages/auth-client";
import * as SecureStore from "expo-secure-store";
import { vi } from "vitest";

import { createMobileAuthTransport } from "./mobileAuthTransport";
import { REFRESH_SESSION_KEY, REFRESH_TOKEN_KEY } from "./refreshTokenStorage";

export const apiUrl = "http://localhost:3456";
export { REFRESH_SESSION_KEY, REFRESH_TOKEN_KEY };

export function mockRefreshTokenStorage(initialToken: string | null = null) {
  const data = new Map<string, string>();
  if (initialToken !== null) data.set(REFRESH_TOKEN_KEY, initialToken);
  const write = async (key: string, value: string) => {
    data.set(key, value);
  };
  vi.mocked(SecureStore.getItemAsync).mockImplementation(
    async (key) => data.get(key) ?? null,
  );
  vi.mocked(SecureStore.setItemAsync).mockImplementation(write);
  vi.mocked(SecureStore.deleteItemAsync).mockImplementation(async (key) => {
    data.delete(key);
  });
  return {
    data,
    write,
    get token(): string | null {
      const raw = data.get(REFRESH_SESSION_KEY);
      return raw === undefined
        ? (data.get(REFRESH_TOKEN_KEY) ?? null)
        : JSON.parse(raw).refreshToken;
    },
  };
}

export function failCredentialWrites(
  store: ReturnType<typeof mockRefreshTokenStorage>,
  token: string,
  failures = 2,
) {
  vi.mocked(SecureStore.setItemAsync).mockImplementation(async (key, value) => {
    if (key === REFRESH_SESSION_KEY) {
      const credential = JSON.parse(value);
      if (
        credential.refreshToken === token &&
        credential.pendingOperationId === null &&
        failures > 0
      ) {
        failures--;
        throw new Error("keychain unavailable");
      }
    }
    await store.write(key, value);
  });
}

export function createTokenHolder() {
  let token: string | null = null;
  return {
    getToken: () => token,
    setToken: (t: string | null) => {
      token = t;
    },
  };
}

// すべての HTTP は vi.stubGlobal("fetch", ...) で global fetch を mock する
export function makeTransport(opts?: {
  tokenHolder?: ReturnType<typeof createTokenHolder>;
}) {
  return createMobileAuthTransport(
    { apiUrl },
    opts?.tokenHolder ?? createTokenHolder(),
  );
}

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export function emptyResponse(status: number): Response {
  return new Response(null, { status });
}

export function validSessionBody(opts?: {
  token?: string;
  refreshToken?: string;
}): AuthSession {
  return {
    token: opts?.token ?? "jwt-token",
    refreshToken: opts?.refreshToken,
    user: {
      id: "user-1",
      name: "Test",
      providers: [],
      plan: "free",
      tabPreference: {
        tabs: ["home", "daily", "stats", "goals", "tasks"],
        updatedAt: "2026-05-14T10:00:00.000Z",
      },
    },
  };
}

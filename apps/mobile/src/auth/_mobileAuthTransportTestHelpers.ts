// mobileAuthTransport.*.test.ts 共通ヘルパー (pure 関数のみ)
// vi.mock("expo-secure-store") / vi.mock("react-native") は各 test file の先頭で行う
import { createMobileAuthTransport } from "./mobileAuthTransport";

export const apiUrl = "http://localhost:3456";
export const REFRESH_TOKEN_KEY = "actiko-refresh-token";

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
}) {
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

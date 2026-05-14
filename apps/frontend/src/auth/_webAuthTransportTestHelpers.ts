// webAuthTransport.*.test.ts 共通ヘルパー
import { createWebAuthTransport } from "./webAuthTransport";

export const apiUrl = "http://localhost:3456";

export function createTokenHolder() {
  let token: string | null = null;
  return {
    getToken: () => token,
    setToken: (t: string | null) => {
      token = t;
    },
  };
}

// vi.stubGlobal("fetch", ...) で global fetch を mock する前提で
// authenticatedFetch も global fetch へデリゲート。logout のテストだけ
// authenticatedFetch を直接 mock したいので opts で override 可能
export function makeTransport(opts?: {
  tokenHolder?: ReturnType<typeof createTokenHolder>;
  authenticatedFetch?: typeof fetch;
}) {
  const authenticatedFetch =
    opts?.authenticatedFetch ?? ((input, init) => fetch(input, init));
  return createWebAuthTransport(
    { apiUrl, authenticatedFetch },
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

export function validSessionBody(token = "jwt-token") {
  return {
    token,
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

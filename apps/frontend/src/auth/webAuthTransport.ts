import type {
  AuthSession,
  AuthTransport,
  RefreshResult,
} from "@packages/auth-client";
import { i18next } from "@packages/i18n";
import { trackServerTimeFromResponse } from "@packages/sync-engine";
import type { Consents } from "@packages/types/request";
import { authResponseSchema } from "@packages/types/response";

type TransportOptions = {
  apiUrl: string;
  // 401 retry + Bearer 自動付与つき fetch (createAuthenticatedFetch 経由)。
  // logout は authMiddleware が Bearer 必須なので、access token 期限切れ時に
  // 自動 refresh + retry されないと「永久に 401 で詰む」状態になる
  authenticatedFetch: typeof fetch;
};

type TokenHolder = {
  getToken: () => string | null;
  setToken: (token: string | null) => void;
};

export function createWebAuthTransport(
  options: TransportOptions,
  tokenHolder: TokenHolder,
): AuthTransport {
  const apiUrl = options.apiUrl.replace(/\/+$/, "");
  const authenticatedFetch = options.authenticatedFetch;

  const parseSession = async (res: Response): Promise<AuthSession> => {
    return authResponseSchema.parse(await res.json());
  };

  const postAuth = (
    path: string,
    body: Record<string, unknown> | undefined,
  ): Promise<Response> => {
    return fetch(`${apiUrl}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: body ? JSON.stringify(body) : undefined,
    });
  };

  return {
    async login(loginId, password) {
      let res: Response;
      try {
        res = await postAuth("/auth/login", { login_id: loginId, password });
        trackServerTimeFromResponse(res);
      } catch {
        throw new Error(i18next.t("common:api.networkError"));
      }
      if (!res.ok) {
        if (res.status === 401)
          throw new Error(i18next.t("common:api.invalidCredentials"));
        if (res.status >= 500)
          throw new Error(i18next.t("common:api.serverError"));
        throw new Error(i18next.t("common:api.loginError"));
      }
      return parseSession(res);
    },
    async register(loginId, password, consents) {
      const res = await postAuth("/user", { loginId, password, consents });
      if (!res.ok) throw new Error("Registration failed");
      return parseSession(res);
    },
    async googleLogin(credential, consents?: Consents) {
      const res = await postAuth("/auth/google", { credential, consents });
      if (!res.ok) throw new Error("Google login failed");
      return parseSession(res);
    },
    async appleLogin(credential, consents?: Consents) {
      const res = await postAuth("/auth/apple", { credential, consents });
      if (!res.ok) throw new Error("Apple login failed");
      return parseSession(res);
    },
    async refreshSession(): Promise<RefreshResult> {
      const res = await postAuth("/auth/token", undefined);
      trackServerTimeFromResponse(res);
      if (res.ok) return { kind: "ok", session: await parseSession(res) };
      // 401/403 等: セッション復元不能。500 系: 一時障害でリトライ可能
      if (res.status < 500) return { kind: "expired" };
      return { kind: "transient", reason: `status ${res.status}` };
    },
    async logout() {
      // /auth/logout は authMiddleware が Bearer 必須。authenticatedFetch は
      // Bearer 自動付与 + 401 retry (refresh → 新 token で再送) を担う。
      // これがないと access token 期限切れ後の logout が永久に 401 で詰まる
      try {
        const res = await authenticatedFetch(`${apiUrl}/auth/logout`, {
          method: "POST",
        });
        // 200 系のみ成功扱い。失敗時は httpOnly cookie が残るため UI 警告対象
        return { ok: res.ok };
      } catch {
        return { ok: false };
      }
    },
    setAccessToken(token) {
      tokenHolder.setToken(token);
    },
    async persistSession() {
      // Web は backend が Set-Cookie で refresh_token を反映するため永続層への書き込みは不要。
      // access token のメモリ反映は setAccessToken の専任。
    },
    async clearPersistedSession() {
      // Web の refresh_token は httpOnly cookie なので JS から削除不能。delete
      // account 経路では backend で revoke + expire 済みのため no-op で問題ない
    },
  };
}

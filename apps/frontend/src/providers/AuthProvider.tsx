import {
  type ReactNode,
  createContext,
  useState,
  useEffect,
  useCallback,
} from "react";

import { apiClient } from "@frontend/utils/apiClient";

import type { LoginRequest } from "@dtos/request/LoginRequest";

type UserState = {
  token: string | null;
  refreshToken: string | null;
} | null;

type RequestStatus = "idle" | "loading";

type AuthState =
  | {
      user: UserState;
      getUser: () => Promise<void>;
      login: ({ login_id, password }: LoginRequest) => Promise<void>;
      logout: () => Promise<void>;
      refreshToken: () => Promise<void>;
      requestStatus: RequestStatus;
    }
  | undefined;

type AuthProviderProps = {
  children: ReactNode;
};

type AuthResponse = {
  token: string;
  refreshToken: string;
};

// JWTをデコードする関数
const decodeJwt = (token: string): { exp?: number } | null => {
  try {
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => `%${(`00${c.charCodeAt(0).toString(16)}`).slice(-2)}`)
        .join(""),
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    return null;
  }
};

// リフレッシュを行うまでの余裕時間（1分）
const REFRESH_THRESHOLD = 60 * 1000;

export const AuthContext = createContext<AuthState>(undefined);

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const token = localStorage.getItem("token");
  const storedRefreshToken = localStorage.getItem("refreshToken");
  const [user, setUser] = useState<UserState>(
    token && storedRefreshToken
      ? {
          token,
          refreshToken: storedRefreshToken,
        }
      : null,
  );
  const [requestStatus, setRequestStatus] = useState<RequestStatus>("idle");

  const getUser = async () => {
    try {
      setRequestStatus("loading");
      // トークンが存在しない場合は未ログイン状態として扱う
      if (!user?.token) {
        setRequestStatus("idle");
        return setUser(null);
      }

      const res = await apiClient.user.me.$get();
      if (res.status > 300) {
        setRequestStatus("idle");
        return setUser(null);
      }
    } catch (e) {
      console.log("AuthProvider", e);
      setRequestStatus("idle");
      return setUser(null);
    }
    setRequestStatus("idle");
  };

  const refreshToken = useCallback(async () => {
    try {
      const currentRefreshToken = localStorage.getItem("refreshToken");
      // 未ログイン状態ではリフレッシュトークンが不要なので、エラーを投げずに早期リターン
      if (!currentRefreshToken) {
        return;
      }

      const res = await apiClient.auth.token.$post({
        json: { refreshToken: currentRefreshToken },
      });

      if (res.status === 200) {
        const json = (await res.json()) as AuthResponse;
        localStorage.setItem("token", json.token);
        localStorage.setItem("refreshToken", json.refreshToken);
        setUser({
          token: json.token,
          refreshToken: json.refreshToken,
        });
      } else {
        throw new Error("Failed to refresh token");
      }
    } catch (e) {
      // リフレッシュトークンが無効な場合のみクリーンアップを実行
      if (e instanceof Error && e.message === "Failed to refresh token") {
        localStorage.removeItem("token");
        localStorage.removeItem("refreshToken");
        setUser(null);
      }
      throw e;
    }
  }, []);

  // トークンの有効期限を監視し、必要に応じて自動リフレッシュを行う
  useEffect(() => {
    let timeoutId: number;

    const scheduleTokenRefresh = () => {
      const currentToken = localStorage.getItem("token");
      if (!currentToken) return;

      const decoded = decodeJwt(currentToken);
      if (!decoded || !decoded.exp) return;

      const expiresAt = decoded.exp * 1000; // Unix timestamp（秒）をミリ秒に変換
      const now = Date.now();
      const timeUntilRefresh = expiresAt - now - REFRESH_THRESHOLD;

      // 有効期限切れまでの時間が閾値を下回っている場合は即座にリフレッシュ
      if (timeUntilRefresh <= 0) {
        // 未ログイン状態でのリフレッシュ試行を防ぐ
        if (user?.token) {
          refreshToken().catch(console.error);
        }
        return;
      }

      // 次回のリフレッシュをスケジュール
      timeoutId = window.setTimeout(() => {
        // 未ログイン状態でのリフレッシュ試行を防ぐ
        if (user?.token) {
          refreshToken().catch(console.error);
        }
      }, timeUntilRefresh);
    };

    // トークンの状態が変更されたらリフレッシュのスケジュールを更新
    if (user?.token) {
      scheduleTokenRefresh();
    }

    return () => {
      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [user?.token, refreshToken]);

  const login = async ({ login_id, password }: LoginRequest) => {
    try {
      const res = await apiClient.auth.login.$post({
        json: {
          login_id,
          password,
        },
      });
      if (res.status === 200) {
        const json = (await res.json()) as AuthResponse;
        localStorage.setItem("token", json.token);
        localStorage.setItem("refreshToken", json.refreshToken);
        setUser({
          token: json.token,
          refreshToken: json.refreshToken,
        });
      } else {
        return Promise.reject("Login failed");
      }
    } catch (e) {
      return Promise.reject(e);
    }
    return Promise.resolve();
  };

  const logout = async () => {
    try {
      await apiClient.auth.logout.$get();
      setUser(null);
      setRequestStatus("idle");
      localStorage.removeItem("token");
      localStorage.removeItem("refreshToken");
    } catch (e) {
      return Promise.reject(e);
    }
  };

  return (
    <AuthContext.Provider
      value={{ user, getUser, login, logout, refreshToken, requestStatus }}
    >
      {children}
    </AuthContext.Provider>
  );
};

import { type ReactNode, createContext, useState, useCallback } from "react";

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
      getUser: ({
        token,
        refreshToken,
      }: { token?: string; refreshToken?: string }) => Promise<void>;
      login: ({ login_id, password }: LoginRequest) => Promise<void>;
      logout: () => Promise<void>;
      refreshToken: () => Promise<void>;
      requestStatus: RequestStatus;
      loginWithToken: (accessToken: string, refreshToken: string) => void;
    }
  | undefined;

type AuthProviderProps = {
  children: ReactNode;
};

type AuthResponse = {
  token: string;
  refreshToken: string;
};

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
    const token = localStorage.getItem("token");
    const refreshToken = localStorage.getItem("refreshToken");
    try {
      setRequestStatus("loading");
      // トークンが存在しない場合は未ログイン状態として扱う
      if (!user?.token && (!token || !refreshToken)) {
        setRequestStatus("idle");
        return setUser(null);
      }

      const res = await apiClient.user.me.$get();

      if (res.status > 300) {
        setRequestStatus("idle");
        return setUser(null);
      }
    } catch (e) {
      setRequestStatus("idle");
      return setUser(null);
    }
    setRequestStatus("idle");
    setUser({
      token,
      refreshToken,
    });
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
      const refreshToken = localStorage.getItem("refreshToken");
      if (refreshToken) {
        await apiClient.auth.logout.$post({
          json: {
            refreshToken,
          },
        });
      }
    } catch (e) {
      console.error("Logout failed:", e);
    } finally {
      setUser(null);
      setRequestStatus("idle");
      localStorage.removeItem("token");
      localStorage.removeItem("refreshToken");
    }
  };

  const loginWithToken = (accessToken: string, refreshToken: string) => {
    localStorage.setItem("token", accessToken);
    localStorage.setItem("refreshToken", refreshToken);
    setUser({
      token: accessToken,
      refreshToken,
    });
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        getUser,
        login,
        logout,
        refreshToken,
        requestStatus,
        loginWithToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

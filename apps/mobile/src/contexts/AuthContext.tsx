import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
  useCallback,
} from "react";

import { tokenStore } from "@packages/frontend-shared";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { useToken } from "../providers/TokenProvider";
import { apiClient } from "../utils/apiClient";
import { eventBus } from "../utils/eventBus";

import type { User } from "@packages/frontend-shared";

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  isInitialized: boolean;
  login: (loginId: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  signup: (loginId: string, password: string, name: string) => Promise<void>;
  getUser: () => Promise<void>;
  refreshToken: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = "accessToken";
const REFRESH_TOKEN_KEY = "refreshToken";

export function AuthProvider({ children }: { children: ReactNode }) {
  const { setAccessToken, clearTokens, scheduleTokenRefresh } = useToken();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);

  // ユーザー情報を取得
  const getUser = useCallback(async () => {
    try {
      console.log("Fetching current user...");
      const response = await apiClient.user.me.$get();
      console.log("User fetch response status:", response.status);
      if (response.ok) {
        const userData = await response.json();
        console.log("User data received:", userData);
        setUser(userData);
      } else {
        throw new Error("Failed to fetch user");
      }
    } catch (error) {
      console.error("Failed to fetch current user:", error);
      setUser(null);
      throw error;
    }
  }, []);

  // トークンリフレッシュ
  const refreshTokenFunc = useCallback(async () => {
    try {
      console.log("Refreshing token...");
      const savedRefreshToken =
        refreshToken || (await AsyncStorage.getItem(REFRESH_TOKEN_KEY));

      if (!savedRefreshToken) {
        throw new Error("No refresh token available");
      }

      // Use custom fetch with refresh token in Authorization header
      const response = await fetch(`${apiClient.auth.token.$url()}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${savedRefreshToken}`,
        },
      });

      if (!response.ok) {
        throw new Error("Token refresh failed");
      }

      const data = await response.json();
      console.log("Token refresh successful");

      // 新しいトークンを保存
      setAccessToken(data.token);
      await AsyncStorage.setItem(TOKEN_KEY, data.token);

      // 新しいリフレッシュトークンも保存
      setRefreshToken(data.refreshToken);
      await AsyncStorage.setItem(REFRESH_TOKEN_KEY, data.refreshToken);

      // リフレッシュをスケジュール
      scheduleTokenRefresh(data.token);
    } catch (error) {
      console.error("Token refresh error:", error);
      clearTokens();
      await AsyncStorage.removeItem(TOKEN_KEY);
      await AsyncStorage.removeItem(REFRESH_TOKEN_KEY);
      setUser(null);
      setRefreshToken(null);
      throw error;
    }
  }, [refreshToken, setAccessToken, clearTokens, scheduleTokenRefresh]);

  // 初期化：保存されたトークンをチェック
  useEffect(() => {
    const initAuth = async () => {
      try {
        // 保存されたトークンを確認
        const savedToken = await AsyncStorage.getItem(TOKEN_KEY);
        const savedRefreshToken = await AsyncStorage.getItem(REFRESH_TOKEN_KEY);

        if (savedToken && savedRefreshToken) {
          setAccessToken(savedToken);
          setRefreshToken(savedRefreshToken);
          scheduleTokenRefresh(savedToken);

          try {
            await getUser();
          } catch (error) {
            // トークンが無効な場合はリフレッシュを試みる
            console.log("Initial user fetch failed, trying to refresh token");
            await refreshTokenFunc();
            await getUser();
          }
        }
      } catch (error) {
        console.log("Auth initialization failed, user needs to login");
      } finally {
        setIsInitialized(true);
      }
    };

    initAuth();
  }, [setAccessToken, scheduleTokenRefresh, getUser, refreshTokenFunc]);

  // トークンリフレッシュイベントをリッスン
  useEffect(() => {
    const handleTokenRefreshNeeded = async () => {
      try {
        await refreshTokenFunc();
      } catch (error) {
        console.error("Token refresh failed:", error);
      }
    };

    eventBus.on("token-refresh-needed", handleTokenRefreshNeeded);

    return () => {
      eventBus.off("token-refresh-needed", handleTokenRefreshNeeded);
    };
  }, [refreshTokenFunc]);

  // ログイン
  const login = useCallback(
    async (loginId: string, password: string) => {
      try {
        setIsLoading(true);
        console.log("Attempting login with:", { login_id: loginId });
        console.log("API URL:", apiClient.auth.login.$url().toString());

        let response: Response;
        try {
          response = await apiClient.auth.login.$post({
            json: {
              login_id: loginId,
              password,
            },
          });
        } catch (networkError) {
          console.error("Network request error:", networkError);
          console.error("Network error details:", {
            message: networkError.message,
            stack: networkError.stack,
            name: networkError.name,
            cause: networkError.cause,
          });
          throw networkError;
        }

        console.log("Login response status:", response.status);
        if (!response.ok) {
          const error = await response.json();
          console.error("Login API error:", error);
          throw new Error(error.message || "Login failed");
        }

        const data = await response.json();
        console.log("Login successful");

        // トークンを保存
        setAccessToken(data.token);
        await AsyncStorage.setItem(TOKEN_KEY, data.token);

        // リフレッシュトークンも保存
        setRefreshToken(data.refreshToken);
        await AsyncStorage.setItem(REFRESH_TOKEN_KEY, data.refreshToken);

        // リフレッシュをスケジュール
        scheduleTokenRefresh(data.token);

        // ユーザー情報を取得
        await getUser();
      } catch (error) {
        console.error("Login error:", error);
        console.error("Error details:", {
          message: error.message,
          stack: error.stack,
          name: error.name,
          cause: error.cause,
        });
        if (error.response) {
          console.error("Response details:", {
            status: error.response.status,
            statusText: error.response.statusText,
            headers: error.response.headers,
            url: error.response.url,
          });
        }
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [setAccessToken, scheduleTokenRefresh, getUser],
  );

  // サインアップ
  const signup = useCallback(
    async (loginId: string, password: string, name: string) => {
      try {
        setIsLoading(true);
        const response = await apiClient.user.$post({
          json: {
            loginId,
            password,
            name,
          },
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || "Signup failed");
        }

        const data = await response.json();
        console.log("Signup successful");

        // トークンを保存
        setAccessToken(data.token);
        await AsyncStorage.setItem(TOKEN_KEY, data.token);

        // リフレッシュトークンも保存（サインアップレスポンスにも含まれる想定）
        if (data.refreshToken) {
          setRefreshToken(data.refreshToken);
          await AsyncStorage.setItem(REFRESH_TOKEN_KEY, data.refreshToken);
        }

        // リフレッシュをスケジュール
        scheduleTokenRefresh(data.token);

        // ユーザー情娱を取得
        await getUser();
      } catch (error) {
        console.error("Signup error:", error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [setAccessToken, scheduleTokenRefresh, getUser],
  );

  // ログアウト
  const logout = useCallback(async () => {
    try {
      setIsLoading(true);
      const savedRefreshToken =
        refreshToken || (await AsyncStorage.getItem(REFRESH_TOKEN_KEY));

      if (savedRefreshToken) {
        // Use custom fetch with refresh token in header
        await fetch(`${apiClient.auth.logout.$url()}`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${tokenStore.getToken()}`,
            "X-Refresh-Token": savedRefreshToken,
          },
        });
      }
    } catch (error) {
      // モバイルアプリではCookieが使えないため、401エラーは無視
      console.log("Logout API call failed (expected for mobile):", error);
    } finally {
      // ローカルの認証状態をクリア
      clearTokens();
      await AsyncStorage.removeItem(TOKEN_KEY);
      await AsyncStorage.removeItem(REFRESH_TOKEN_KEY);
      setUser(null);
      setRefreshToken(null);
      setIsLoading(false);
    }
  }, [refreshToken, clearTokens]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isInitialized,
        login,
        logout,
        signup,
        getUser,
        refreshToken: refreshTokenFunc,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
  useCallback,
} from "react";

import AsyncStorage from "@react-native-async-storage/async-storage";

import { useToken } from "../providers/TokenProvider";
import { apiClient } from "../services/apiClient";

import type { User } from "@packages/auth-core";

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

export function AuthProvider({ children }: { children: ReactNode }) {
  const { setAccessToken, clearTokens, scheduleTokenRefresh } = useToken();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

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
  const refreshToken = useCallback(async () => {
    try {
      console.log("Refreshing token...");
      const response = await apiClient.auth.refresh.$post();

      if (!response.ok) {
        throw new Error("Token refresh failed");
      }

      const data = await response.json();
      console.log("Token refresh successful");

      // 新しいトークンを保存
      setAccessToken(data.token);
      await AsyncStorage.setItem(TOKEN_KEY, data.token);

      // リフレッシュをスケジュール
      scheduleTokenRefresh(data.token);

      // token-refreshedイベントを発火
      if (typeof window !== "undefined" && window.dispatchEvent) {
        window.dispatchEvent(
          new CustomEvent("token-refreshed", { detail: data.token }),
        );
      }
    } catch (error) {
      console.error("Token refresh error:", error);
      clearTokens();
      await AsyncStorage.removeItem(TOKEN_KEY);
      setUser(null);
      throw error;
    }
  }, [setAccessToken, clearTokens, scheduleTokenRefresh]);

  // トークンリフレッシュイベントのリスナー
  useEffect(() => {
    const handleTokenRefreshNeeded = () => {
      console.log("Token refresh needed event received");
      refreshToken().catch(console.error);
    };

    if (typeof window !== "undefined" && window.addEventListener) {
      window.addEventListener("token-refresh-needed", handleTokenRefreshNeeded);
      return () => {
        window.removeEventListener(
          "token-refresh-needed",
          handleTokenRefreshNeeded,
        );
      };
    }
  }, [refreshToken]);

  // 初期化：保存されたトークンをチェック
  useEffect(() => {
    const initAuth = async () => {
      try {
        // 保存されたトークンを確認
        const savedToken = await AsyncStorage.getItem(TOKEN_KEY);
        if (savedToken) {
          setAccessToken(savedToken);
          scheduleTokenRefresh(savedToken);
          await getUser();
        }
        // モバイルアプリではCookieが使えないため、初回リフレッシュは行わない
      } catch (error) {
        console.log("Auth initialization failed, user needs to login");
      } finally {
        setIsInitialized(true);
      }
    };

    initAuth();
  }, [setAccessToken, scheduleTokenRefresh, getUser, refreshToken]);

  // ログイン
  const login = useCallback(
    async (loginId: string, password: string) => {
      try {
        setIsLoading(true);
        console.log("Attempting login with:", { login_id: loginId });
        const response = await apiClient.auth.login.$post({
          json: {
            login_id: loginId,
            password,
          },
        });

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

        // リフレッシュをスケジュール
        scheduleTokenRefresh(data.token);

        // ユーザー情報を取得
        await getUser();
      } catch (error) {
        console.error("Login error:", error);
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

        // リフレッシュをスケジュール
        scheduleTokenRefresh(data.token);

        // ユーザー情報を取得
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
      await apiClient.auth.logout.$post();
    } catch (error) {
      // モバイルアプリではCookieが使えないため、401エラーは無視
      console.log("Logout API call failed (expected for mobile):", error);
    } finally {
      // ローカルの認証状態をクリア
      clearTokens();
      await AsyncStorage.removeItem(TOKEN_KEY);
      setUser(null);
      setIsLoading(false);
    }
  }, [clearTokens]);

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
        refreshToken,
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

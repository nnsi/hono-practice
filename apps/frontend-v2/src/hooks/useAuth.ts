import { useCallback, useEffect, useState } from "react";
import { db } from "../db/schema";
import { apiLogin, clearToken, setToken, apiClient } from "../utils/apiClient";
import { performInitialSync, clearLocalDataForUserSwitch } from "../sync/initialSync";

type AuthState = {
  isLoggedIn: boolean;
  isLoading: boolean;
  userId: string | null;
  login: (loginId: string, password: string) => Promise<void>;
  googleLogin: (credential: string) => Promise<void>;
  register: (name: string, loginId: string, password: string) => Promise<void>;
  logout: () => void;
};

export function useAuth(): AuthState {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  // 起動時の認証チェック
  useEffect(() => {
    const tryOfflineAuth = async (): Promise<boolean> => {
      const authState = await db.authState.get("current");
      if (authState) {
        const lastLogin = new Date(authState.lastLoginAt);
        const hoursAgo =
          (Date.now() - lastLogin.getTime()) / (1000 * 60 * 60);
        if (hoursAgo < 1) {
          setUserId(authState.userId);
          setIsLoggedIn(true);
          return true;
        }
      }
      return false;
    };

    const syncWithUserCheck = async (newUserId: string) => {
      const authState = await db.authState.get("current");
      if (authState && authState.userId !== newUserId) {
        await clearLocalDataForUserSwitch();
      }
      await performInitialSync(newUserId);
    };

    const serverRefreshAndSync = async () => {
      const res = await apiClient.auth.token.$post();
      if (!res.ok) return;
      const data = await res.json();
      setToken(data.token);

      const userRes = await apiClient.user.me.$get();
      if (!userRes.ok) return;
      const user = await userRes.json();
      setUserId(user.id);
      setIsLoggedIn(true);
      await syncWithUserCheck(user.id);
    };

    const init = async () => {
      const offlineOk = await tryOfflineAuth();
      if (offlineOk) {
        // ローカルキャッシュで即UI表示 → サーバー同期はバックグラウンド
        setIsLoading(false);
        serverRefreshAndSync().catch(console.error);
      } else {
        // オフライン認証なし → サーバー認証を待つ
        try {
          await serverRefreshAndSync();
        } catch {
          // ネットワークエラー
        } finally {
          setIsLoading(false);
        }
      }
    };
    init();
  }, []);

  const loginWithUserCheck = useCallback(async (newUserId: string) => {
    const authState = await db.authState.get("current");
    if (authState && authState.userId !== newUserId) {
      await clearLocalDataForUserSwitch();
    }
    setUserId(newUserId);
    setIsLoggedIn(true);
    await performInitialSync(newUserId);
  }, []);

  const login = useCallback(async (loginId: string, password: string) => {
    await apiLogin(loginId, password);
    const userRes = await apiClient.user.me.$get();
    if (!userRes.ok) {
      throw new Error("Failed to fetch user after login");
    }
    const user = await userRes.json();
    await loginWithUserCheck(user.id);
  }, [loginWithUserCheck]);

  const googleLogin = useCallback(async (credential: string) => {
    const res = await apiClient.auth.google.$post({
      json: { credential },
    });
    if (!res.ok) {
      throw new Error("Google login failed");
    }
    const data = await res.json();
    setToken(data.token);
    const userRes = await apiClient.user.me.$get();
    if (!userRes.ok) {
      throw new Error("Failed to fetch user after Google login");
    }
    const user = await userRes.json();
    await loginWithUserCheck(user.id);
  }, [loginWithUserCheck]);

  const register = useCallback(async (name: string, loginId: string, password: string) => {
    const res = await apiClient.user.$post({
      json: { name: name || undefined, loginId, password },
    });
    if (!res.ok) {
      throw new Error("Registration failed");
    }
    const data = await res.json();
    setToken(data.token);
    const userRes = await apiClient.user.me.$get();
    if (!userRes.ok) {
      throw new Error("Failed to fetch user after registration");
    }
    const user = await userRes.json();
    await loginWithUserCheck(user.id);
  }, [loginWithUserCheck]);

  const logout = useCallback(() => {
    // サーバーサイドのセッション無効化（fire-and-forget）
    apiClient.auth.logout.$post().catch(() => {});
    clearToken();
    setIsLoggedIn(false);
    setUserId(null);
    db.authState.delete("current");
  }, []);

  return { isLoggedIn, isLoading, userId, login, googleLogin, register, logout };
}

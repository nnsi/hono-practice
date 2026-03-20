import { useCallback, useEffect, useRef, useState } from "react";

import { useQueryClient } from "@tanstack/react-query";

import { db } from "../db/schema";
import { clearLocalData, performInitialSync } from "../sync/initialSync";
import { apiClient, apiLogin, clearToken, setToken } from "../utils/apiClient";

type AuthState = {
  isLoggedIn: boolean;
  isLoading: boolean;
  syncReady: boolean;
  userId: string | null;
  login: (loginId: string, password: string) => Promise<void>;
  googleLogin: (credential: string) => Promise<void>;
  appleLogin: (credential: string) => Promise<void>;
  register: (name: string, loginId: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

export function useAuth(): AuthState {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [syncReady, setSyncReady] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const onlineRetryRef = useRef<(() => void) | null>(null);
  const authGenRef = useRef(0);

  // 起動時の認証チェック
  useEffect(() => {
    const tryOfflineAuth = async (): Promise<boolean> => {
      const authState = await db.authState.get("current");
      if (authState?.lastLoginAt) {
        setUserId(authState.userId);
        setIsLoggedIn(true);
        return true;
      }
      return false;
    };

    const syncWithUserCheck = async (newUserId: string) => {
      const authState = await db.authState.get("current");
      if (authState && authState.userId !== newUserId) {
        await clearLocalData();
      }
      await performInitialSync(newUserId);
    };

    const serverRefreshAndSync = async (): Promise<boolean> => {
      const gen = authGenRef.current;
      const res = await apiClient.auth.token.$post();
      if (!res.ok) return false;
      if (gen !== authGenRef.current) return false;
      const data = await res.json();
      if (gen !== authGenRef.current) return false;
      setToken(data.token);

      const userRes = await apiClient.user.me.$get();
      if (!userRes.ok) return false;
      if (gen !== authGenRef.current) return false;
      const user = await userRes.json();
      if (gen !== authGenRef.current) return false;
      setUserId(user.id);
      setIsLoggedIn(true);
      await syncWithUserCheck(user.id);
      if (gen !== authGenRef.current) return false;
      setSyncReady(true);
      return true;
    };

    const init = async () => {
      const offlineOk = await tryOfflineAuth();
      if (offlineOk) {
        // ローカルキャッシュで即UI表示 → サーバー同期はバックグラウンド
        setIsLoading(false);
        try {
          await serverRefreshAndSync();
        } catch {
          // ネットワークエラー（オフライン等）→ オンライン復帰時にリトライ
          const handler = () => {
            // 重複実行防止: 先にリスナー解除
            window.removeEventListener("online", handler);
            serverRefreshAndSync()
              .then(() => {
                // 成功 or HTTPエラー → リトライ不要
                onlineRetryRef.current = null;
              })
              .catch(() => {
                // まだオフライン → 次のonline時にリトライ
                if (onlineRetryRef.current === handler) {
                  window.addEventListener("online", handler);
                }
              });
          };
          onlineRetryRef.current = handler;
          window.addEventListener("online", handler);
        }
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

    return () => {
      if (onlineRetryRef.current) {
        window.removeEventListener("online", onlineRetryRef.current);
        onlineRetryRef.current = null;
      }
    };
  }, []);

  const loginWithUserCheck = useCallback(async (newUserId: string) => {
    const authState = await db.authState.get("current");
    if (authState && authState.userId !== newUserId) {
      await clearLocalData();
    }
    setUserId(newUserId);
    setIsLoggedIn(true);
    await performInitialSync(newUserId);
    setSyncReady(true);
  }, []);

  const login = useCallback(
    async (loginId: string, password: string) => {
      await apiLogin(loginId, password);
      const userRes = await apiClient.user.me.$get();
      if (!userRes.ok) {
        throw new Error("Failed to fetch user after login");
      }
      const user = await userRes.json();
      await loginWithUserCheck(user.id);
    },
    [loginWithUserCheck],
  );

  const googleLogin = useCallback(
    async (credential: string) => {
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
    },
    [loginWithUserCheck],
  );

  const appleLogin = useCallback(
    async (credential: string) => {
      const res = await apiClient.auth.apple.$post({
        json: { credential },
      });
      if (!res.ok) {
        throw new Error("Apple login failed");
      }
      const data = await res.json();
      setToken(data.token);
      const userRes = await apiClient.user.me.$get();
      if (!userRes.ok) {
        throw new Error("Failed to fetch user after Apple login");
      }
      const user = await userRes.json();
      await loginWithUserCheck(user.id);
    },
    [loginWithUserCheck],
  );

  const register = useCallback(
    async (name: string, loginId: string, password: string) => {
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
    },
    [loginWithUserCheck],
  );

  const logout = useCallback(async () => {
    // in-flightのserverRefreshAndSyncをキャンセル（世代番号）
    authGenRef.current++;
    // onlineリトライハンドラを解除
    if (onlineRetryRef.current) {
      window.removeEventListener("online", onlineRetryRef.current);
      onlineRetryRef.current = null;
    }
    // サーバーサイドのセッション無効化（fire-and-forget）
    apiClient.auth.logout.$post().catch(() => {});
    clearToken();
    setIsLoggedIn(false);
    setSyncReady(false);
    setUserId(null);
    queryClient.clear();
    // authStateのuserIdは保持し、lastLoginAtのみ無効化する。
    // 削除するとloginWithUserCheckでユーザー切替を検知できず、
    // 前ユーザーのデータが残る＋LAST_SYNCED_KEYが前ユーザーのタイムスタンプのままになる。
    await db.authState.update("current", { lastLoginAt: "" });
  }, [queryClient]);

  return {
    isLoggedIn,
    isLoading,
    syncReady,
    userId,
    login,
    googleLogin,
    appleLogin,
    register,
    logout,
  };
}

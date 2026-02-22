import { useCallback, useEffect, useState } from "react";
import { db } from "../db/schema";
import { apiLogin, clearToken, setToken, apiFetch } from "../utils/apiClient";
import { performInitialSync } from "../sync/initialSync";

type AuthState = {
  isLoggedIn: boolean;
  isLoading: boolean;
  userId: string | null;
  login: (loginId: string, password: string) => Promise<void>;
  logout: () => void;
};

export function useAuth(): AuthState {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  // 起動時の認証チェック
  useEffect(() => {
    const init = async () => {
      try {
        // まずトークンリフレッシュを試みる
        const res = await apiFetch("/auth/token", {
          method: "POST",
          credentials: "include",
        });
        if (res.ok) {
          const data = await res.json();
          setToken(data.token);

          // ユーザー情報を取得
          const userRes = await apiFetch("/user/me");
          if (userRes.ok) {
            const user = await userRes.json();
            setUserId(user.id);
            setIsLoggedIn(true);
            await performInitialSync(user.id);
          }
        } else {
          // オフラインまたはトークン無効 → Dexie authState チェック
          const authState = await db.authState.get("current");
          if (authState) {
            const lastLogin = new Date(authState.lastLoginAt);
            const hoursAgo =
              (Date.now() - lastLogin.getTime()) / (1000 * 60 * 60);
            if (hoursAgo < 24) {
              setUserId(authState.userId);
              setIsLoggedIn(true);
            }
          }
        }
      } catch {
        // ネットワークエラー → オフラインモード
        const authState = await db.authState.get("current");
        if (authState) {
          const lastLogin = new Date(authState.lastLoginAt);
          const hoursAgo =
            (Date.now() - lastLogin.getTime()) / (1000 * 60 * 60);
          if (hoursAgo < 24) {
            setUserId(authState.userId);
            setIsLoggedIn(true);
          }
        }
      } finally {
        setIsLoading(false);
      }
    };
    init();
  }, []);

  const login = useCallback(async (loginId: string, password: string) => {
    await apiLogin(loginId, password);
    // ユーザー情報を取得
    const userRes = await apiFetch("/user/me");
    if (!userRes.ok) {
      throw new Error("Failed to fetch user after login");
    }
    const user = await userRes.json();
    setUserId(user.id);
    setIsLoggedIn(true);
    await performInitialSync(user.id);
  }, []);

  const logout = useCallback(() => {
    // サーバーサイドのセッション無効化（fire-and-forget）
    apiFetch("/auth/logout", { method: "POST", credentials: "include" }).catch(
      () => {},
    );
    clearToken();
    setIsLoggedIn(false);
    setUserId(null);
    db.authState.delete("current");
  }, []);

  return { isLoggedIn, isLoading, userId, login, logout };
}

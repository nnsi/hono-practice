import { useCallback, useEffect, useState } from "react";
import { getDatabase } from "../db/database";
import {
  apiLogin,
  apiRegister,
  apiGetMe,
  apiRefreshToken,
  apiLogout,
  apiGoogleLogin,
  setToken,
  clearToken,
} from "../utils/apiClient";
import {
  performInitialSync,
  clearLocalData,
} from "../sync/initialSync";
import { loadStorageCache } from "../sync/rnPlatformAdapters";

type AuthState = {
  isLoggedIn: boolean;
  isLoading: boolean;
  userId: string | null;
  login: (loginId: string, password: string) => Promise<void>;
  googleLogin: (credential: string) => Promise<void>;
  register: (
    name: string,
    loginId: string,
    password: string
  ) => Promise<void>;
  logout: () => Promise<void>;
};

export function useAuth(): AuthState {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const syncWithUserCheck = async (newUserId: string) => {
      const db = await getDatabase();
      const authState = await db.getFirstAsync<{ user_id: string }>(
        "SELECT user_id FROM auth_state WHERE id = 'current'"
      );
      if (authState && authState.user_id !== newUserId) {
        await clearLocalData();
      }
      await performInitialSync(newUserId);
    };

    const serverRefreshAndSync = async () => {
      const data = await apiRefreshToken();
      setToken(data.token);
      const user = await apiGetMe();
      setUserId(user.id);
      setIsLoggedIn(true);
      await syncWithUserCheck(user.id);
    };

    const init = async () => {
      await loadStorageCache();
      const db = await getDatabase();

      // Try offline auth first
      const authState = await db.getFirstAsync<{
        user_id: string;
        last_login_at: string;
      }>(
        "SELECT user_id, last_login_at FROM auth_state WHERE id = 'current'"
      );

      if (authState && authState.last_login_at) {
        const hoursAgo =
          (Date.now() - new Date(authState.last_login_at).getTime()) /
          (1000 * 60 * 60);
        if (hoursAgo < 1) {
          setUserId(authState.user_id);
          setIsLoggedIn(true);
          setIsLoading(false);
          // Background server refresh
          serverRefreshAndSync().catch(console.error);
          return;
        }
      }

      // No valid offline session, try server
      try {
        await serverRefreshAndSync();
      } catch {
        // unable to refresh - stay logged out
      }
      setIsLoading(false);
    };

    init();
  }, []);

  const loginWithUserCheck = useCallback(async (newUserId: string) => {
    const db = await getDatabase();
    const authState = await db.getFirstAsync<{ user_id: string }>(
      "SELECT user_id FROM auth_state WHERE id = 'current'"
    );
    if (authState && authState.user_id !== newUserId) {
      await clearLocalData();
    }
    setUserId(newUserId);
    setIsLoggedIn(true);
    await performInitialSync(newUserId);
  }, []);

  const login = useCallback(
    async (loginId: string, password: string) => {
      await apiLogin(loginId, password);
      const user = await apiGetMe();
      await loginWithUserCheck(user.id);
    },
    [loginWithUserCheck]
  );

  const googleLogin = useCallback(
    async (credential: string) => {
      await apiGoogleLogin(credential);
      const user = await apiGetMe();
      await loginWithUserCheck(user.id);
    },
    [loginWithUserCheck]
  );

  const register = useCallback(
    async (name: string, loginId: string, password: string) => {
      await apiRegister(name, loginId, password);
      const user = await apiGetMe();
      await loginWithUserCheck(user.id);
    },
    [loginWithUserCheck]
  );

  const logout = useCallback(async () => {
    apiLogout().catch(console.error);
    clearToken();
    setIsLoggedIn(false);
    setUserId(null);
    // authStateのuser_idは保持し、last_login_atのみ無効化する。
    // 削除するとloginWithUserCheckでユーザー切替を検知できず、
    // 前ユーザーのデータが残る＋LAST_SYNCED_KEYが前ユーザーのタイムスタンプのままになる。
    const db = await getDatabase();
    await db.runAsync("UPDATE auth_state SET last_login_at = '' WHERE id = 'current'");
  }, []);

  return {
    isLoggedIn,
    isLoading,
    userId,
    login,
    googleLogin,
    register,
    logout,
  };
}

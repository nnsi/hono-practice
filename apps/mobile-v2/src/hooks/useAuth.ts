import { useCallback, useEffect, useRef, useState } from "react";

import NetInfo from "@react-native-community/netinfo";

import { getDatabase } from "../db/database";
import { clearLocalData, performInitialSync } from "../sync/initialSync";
import { loadStorageCache } from "../sync/rnPlatformAdapters";
import {
  apiGetMe,
  apiGoogleLogin,
  apiLogin,
  apiLogout,
  apiRefreshToken,
  apiRegister,
  clearToken,
  setToken,
} from "../utils/apiClient";

type AuthState = {
  isLoggedIn: boolean;
  isLoading: boolean;
  syncReady: boolean;
  userId: string | null;
  login: (loginId: string, password: string) => Promise<void>;
  googleLogin: (credential: string) => Promise<void>;
  register: (name: string, loginId: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

export function useAuth(): AuthState {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [syncReady, setSyncReady] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const onlineRetryRef = useRef<(() => void) | null>(null);
  const authGenRef = useRef(0);

  useEffect(() => {
    const syncWithUserCheck = async (newUserId: string) => {
      const db = await getDatabase();
      const authState = await db.getFirstAsync<{ user_id: string }>(
        "SELECT user_id FROM auth_state WHERE id = 'current'",
      );
      if (authState && authState.user_id !== newUserId) {
        await clearLocalData();
      }
      await performInitialSync(newUserId);
    };

    const serverRefreshAndSync = async (): Promise<boolean> => {
      const gen = authGenRef.current;
      const data = await apiRefreshToken();
      if (gen !== authGenRef.current) return false;
      setToken(data.token);
      const user = await apiGetMe();
      if (gen !== authGenRef.current) return false;
      setUserId(user.id);
      setIsLoggedIn(true);
      await syncWithUserCheck(user.id);
      if (gen !== authGenRef.current) return false;
      setSyncReady(true);
      return true;
    };

    const init = async () => {
      await loadStorageCache();
      const db = await getDatabase();

      // Try offline auth first
      const authState = await db.getFirstAsync<{
        user_id: string;
        last_login_at: string;
      }>("SELECT user_id, last_login_at FROM auth_state WHERE id = 'current'");

      if (authState?.last_login_at) {
        setUserId(authState.user_id);
        setIsLoggedIn(true);
        setIsLoading(false);
        // Background server refresh
        try {
          await serverRefreshAndSync();
        } catch {
          // ネットワークエラー（オフライン等）→ オンライン復帰時にリトライ
          const unsub = NetInfo.addEventListener((state) => {
            if (!state.isConnected) return;
            unsub();
            serverRefreshAndSync()
              .then(() => {
                onlineRetryRef.current = null;
              })
              .catch(() => {
                // まだ失敗 → 再登録
                if (onlineRetryRef.current) {
                  const newUnsub = NetInfo.addEventListener((s) => {
                    if (!s.isConnected) return;
                    newUnsub();
                    serverRefreshAndSync().catch(() => {});
                  });
                }
              });
          });
          onlineRetryRef.current = unsub;
        }
        return;
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

    return () => {
      if (onlineRetryRef.current) {
        onlineRetryRef.current();
        onlineRetryRef.current = null;
      }
    };
  }, []);

  const loginWithUserCheck = useCallback(async (newUserId: string) => {
    const db = await getDatabase();
    const authState = await db.getFirstAsync<{ user_id: string }>(
      "SELECT user_id FROM auth_state WHERE id = 'current'",
    );
    if (authState && authState.user_id !== newUserId) {
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
      const user = await apiGetMe();
      await loginWithUserCheck(user.id);
    },
    [loginWithUserCheck],
  );

  const googleLogin = useCallback(
    async (credential: string) => {
      await apiGoogleLogin(credential);
      const user = await apiGetMe();
      await loginWithUserCheck(user.id);
    },
    [loginWithUserCheck],
  );

  const register = useCallback(
    async (name: string, loginId: string, password: string) => {
      await apiRegister(name, loginId, password);
      const user = await apiGetMe();
      await loginWithUserCheck(user.id);
    },
    [loginWithUserCheck],
  );

  const logout = useCallback(async () => {
    // in-flightのserverRefreshAndSyncをキャンセル（世代番号）
    authGenRef.current++;
    // onlineリトライリスナーを解除
    if (onlineRetryRef.current) {
      onlineRetryRef.current();
      onlineRetryRef.current = null;
    }
    apiLogout().catch(console.error);
    clearToken();
    setIsLoggedIn(false);
    setSyncReady(false);
    setUserId(null);
    // authStateのuser_idは保持し、last_login_atのみ無効化する。
    // 削除するとloginWithUserCheckでユーザー切替を検知できず、
    // 前ユーザーのデータが残る＋LAST_SYNCED_KEYが前ユーザーのタイムスタンプのままになる。
    const db = await getDatabase();
    await db.runAsync(
      "UPDATE auth_state SET last_login_at = '' WHERE id = 'current'",
    );
  }, []);

  return {
    isLoggedIn,
    isLoading,
    syncReady,
    userId,
    login,
    googleLogin,
    register,
    logout,
  };
}

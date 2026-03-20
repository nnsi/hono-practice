import { useCallback, useEffect, useRef, useState } from "react";

import NetInfo from "@react-native-community/netinfo";

import { getDatabase } from "../db/database";
import { clearLocalData, performInitialSync } from "../sync/initialSync";
import { loadStorageCache } from "../sync/rnPlatformAdapters";
import {
  apiAppleLogin,
  apiGetMe,
  apiGoogleLogin,
  apiLogin,
  apiLogout,
  apiRefreshToken,
  apiRegister,
  clearToken,
  setToken,
} from "../utils/apiClient";
import { reportError } from "../utils/errorReporter";

type AuthState = {
  isLoggedIn: boolean;
  isLoading: boolean;
  syncReady: boolean;
  userId: string | null;
  login: (loginId: string, password: string) => Promise<void>;
  googleLogin: (credential: string) => Promise<void>;
  appleLogin: (credential: string) => Promise<void>;
  completeLogin: (userId: string) => Promise<void>;
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
      if (authState && authState.user_id !== newUserId) await clearLocalData();
      try {
        await performInitialSync(newUserId);
      } catch (err) {
        reportError({
          errorType: "unhandled_error",
          message: `Initial sync failed: ${err instanceof Error ? err.message : String(err)}`,
          stack: err instanceof Error ? err.stack : undefined,
        });
        throw err;
      }
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

    // オンライン復帰時に serverRefreshAndSync をリトライ（最大2回）
    const registerOnlineRetry = (isLastAttempt: boolean) => {
      let unsub: (() => void) | null = null;
      unsub = NetInfo.addEventListener((state) => {
        if (!state.isConnected) return;
        // コールバックが同期的に発火する場合 unsub が未代入のため次tickで解除
        queueMicrotask(() => unsub?.());
        serverRefreshAndSync()
          .then(() => {
            onlineRetryRef.current = null;
          })
          .catch((err: unknown) => {
            if (!isLastAttempt) {
              registerOnlineRetry(true);
              return;
            }
            onlineRetryRef.current = null;
            reportError({
              errorType: "network_error",
              message: err instanceof Error ? err.message : "Auth retry failed",
              stack: err instanceof Error ? err.stack : undefined,
            });
          });
      });
      onlineRetryRef.current = unsub;
    };

    const init = async () => {
      await loadStorageCache();
      const db = await getDatabase();
      const authState = await db.getFirstAsync<{
        user_id: string;
        last_login_at: string;
      }>("SELECT user_id, last_login_at FROM auth_state WHERE id = 'current'");

      if (authState?.last_login_at) {
        setUserId(authState.user_id);
        setIsLoggedIn(true);
        setIsLoading(false);
        try {
          await serverRefreshAndSync();
        } catch {
          registerOnlineRetry(false);
        }
        return;
      }

      try {
        await serverRefreshAndSync();
      } catch {
        // unable to refresh - stay logged out
      }
      setIsLoading(false);
    };

    init();
    return () => {
      onlineRetryRef.current?.();
      onlineRetryRef.current = null;
    };
  }, []);

  const loginWithUserCheck = useCallback(async (newUserId: string) => {
    const db = await getDatabase();
    const authState = await db.getFirstAsync<{ user_id: string }>(
      "SELECT user_id FROM auth_state WHERE id = 'current'",
    );
    if (authState && authState.user_id !== newUserId) await clearLocalData();
    setUserId(newUserId);
    setIsLoggedIn(true);
    try {
      await performInitialSync(newUserId);
    } catch (err) {
      reportError({
        errorType: "unhandled_error",
        message: `Login sync failed: ${err instanceof Error ? err.message : String(err)}`,
        stack: err instanceof Error ? err.stack : undefined,
      });
    }
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

  const appleLogin = useCallback(
    async (credential: string) => {
      await apiAppleLogin(credential);
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
    authGenRef.current++;
    if (onlineRetryRef.current) {
      onlineRetryRef.current();
      onlineRetryRef.current = null;
    }
    apiLogout().catch((err: unknown) => {
      reportError({
        errorType: "network_error",
        message: err instanceof Error ? err.message : "Logout failed",
        stack: err instanceof Error ? err.stack : undefined,
      });
    });
    clearToken();
    setIsLoggedIn(false);
    setSyncReady(false);
    setUserId(null);
    // user_idは保持しlast_login_atのみ無効化（loginWithUserCheckでユーザー切替を検知するため）
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
    appleLogin,
    completeLogin: loginWithUserCheck,
    register,
    logout,
  };
}

import { useCallback, useRef, useState } from "react";

import { getDatabase } from "../db/database";
import { clearLocalData, performInitialSync } from "../sync/initialSync";
import { clearToken } from "../utils/apiClient";
import {
  apiAppleLogin,
  apiGetMe,
  apiGoogleLogin,
  apiLogin,
  apiLogout,
  apiRegister,
} from "../utils/authApi";
import { reportError } from "../utils/errorReporter";
import { useAuthInit } from "./useAuthInit";

type AuthState = {
  isLoggedIn: boolean;
  isLoading: boolean;
  syncReady: boolean;
  userId: string | null;
  login: (loginId: string, password: string) => Promise<void>;
  googleLogin: (credential: string) => Promise<void>;
  appleLogin: (credential: string) => Promise<void>;
  completeLogin: (userId: string) => Promise<void>;
  register: (loginId: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

export function useAuth(): AuthState {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [syncReady, setSyncReady] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const onlineRetryRef = useRef<(() => void) | null>(null);
  const authGenRef = useRef(0);

  useAuthInit({
    setUserId,
    setIsLoggedIn,
    setIsLoading,
    setSyncReady,
    authGenRef,
    onlineRetryRef,
  });

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

  const persistPlan = useCallback(async (plan: string) => {
    const db = await getDatabase();
    await db.runAsync("UPDATE auth_state SET plan = ? WHERE id = 'current'", [
      plan ?? "free",
    ]);
  }, []);

  const login = useCallback(
    async (loginId: string, password: string) => {
      await apiLogin(loginId, password);
      const user = await apiGetMe();
      await loginWithUserCheck(user.id);
      await persistPlan(user.plan);
    },
    [loginWithUserCheck, persistPlan],
  );

  const googleLogin = useCallback(
    async (credential: string) => {
      await apiGoogleLogin(credential);
      const user = await apiGetMe();
      await loginWithUserCheck(user.id);
      await persistPlan(user.plan);
    },
    [loginWithUserCheck, persistPlan],
  );

  const appleLogin = useCallback(
    async (credential: string) => {
      await apiAppleLogin(credential);
      const user = await apiGetMe();
      await loginWithUserCheck(user.id);
      await persistPlan(user.plan);
    },
    [loginWithUserCheck, persistPlan],
  );

  const register = useCallback(
    async (loginId: string, password: string) => {
      await apiRegister(loginId, password);
      const user = await apiGetMe();
      await loginWithUserCheck(user.id);
      await persistPlan(user.plan);
    },
    [loginWithUserCheck, persistPlan],
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

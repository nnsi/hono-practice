import { useCallback, useRef, useState } from "react";

import type { Consents } from "@packages/types/request";
import type { GetUserResponse } from "@packages/types/response";
import { useQueryClient } from "@tanstack/react-query";

import {
  clearStoredTabPreference,
  flushPendingTabPreference,
  reconcileTabPreferenceFromServer,
} from "../components/setting/tabPreferenceStore";
import { db } from "../db/schema";
import { clearLocalData, performInitialSync } from "../sync/initialSync";
import { apiClient, apiLogin, clearToken, setToken } from "../utils/apiClient";
import { useAuthInit } from "./useAuthInit";

type AuthState = {
  isLoggedIn: boolean;
  isLoading: boolean;
  syncReady: boolean;
  userId: string | null;
  login: (loginId: string, password: string) => Promise<void>;
  googleLogin: (credential: string, consents?: Consents) => Promise<void>;
  appleLogin: (credential: string, consents?: Consents) => Promise<void>;
  register: (
    loginId: string,
    password: string,
    consents: Consents,
  ) => Promise<void>;
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

  useAuthInit({
    setUserId,
    setIsLoggedIn,
    setIsLoading,
    setSyncReady,
    authGenRef,
    onlineRetryRef,
  });

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

  const fetchAuthenticatedUser = useCallback(
    async (errorMessage: string): Promise<GetUserResponse> => {
      const userRes = await apiClient.user.me.$get();
      if (!userRes.ok) {
        throw new Error(errorMessage);
      }
      return userRes.json();
    },
    [],
  );

  const finalizeLogin = useCallback(
    async (user: GetUserResponse) => {
      await reconcileTabPreferenceFromServer(user.tabPreference);
      await flushPendingTabPreference();
      await loginWithUserCheck(user.id);
      await db.authState.update("current", { plan: user.plan });
    },
    [loginWithUserCheck],
  );

  const login = useCallback(
    async (loginId: string, password: string) => {
      await apiLogin(loginId, password);
      await finalizeLogin(
        await fetchAuthenticatedUser("Failed to fetch user after login"),
      );
    },
    [fetchAuthenticatedUser, finalizeLogin],
  );

  const googleLogin = useCallback(
    async (credential: string, consents?: Consents) => {
      const res = await apiClient.auth.google.$post({
        json: { credential, consents },
      });
      if (!res.ok) {
        throw new Error("Google login failed");
      }
      const data = await res.json();
      setToken(data.token);
      await finalizeLogin(
        await fetchAuthenticatedUser("Failed to fetch user after Google login"),
      );
    },
    [fetchAuthenticatedUser, finalizeLogin],
  );

  const appleLogin = useCallback(
    async (credential: string, consents?: Consents) => {
      const res = await apiClient.auth.apple.$post({
        json: { credential, consents },
      });
      if (!res.ok) {
        throw new Error("Apple login failed");
      }
      const data = await res.json();
      setToken(data.token);
      await finalizeLogin(
        await fetchAuthenticatedUser("Failed to fetch user after Apple login"),
      );
    },
    [fetchAuthenticatedUser, finalizeLogin],
  );

  const register = useCallback(
    async (loginId: string, password: string, consents: Consents) => {
      const res = await apiClient.user.$post({
        json: { loginId, password, consents },
      });
      if (!res.ok) {
        throw new Error("Registration failed");
      }
      const data = await res.json();
      setToken(data.token);
      await finalizeLogin(
        await fetchAuthenticatedUser("Failed to fetch user after registration"),
      );
      await db.authState.update("current", { tutorialStatus: "pending" });
    },
    [fetchAuthenticatedUser, finalizeLogin],
  );

  const logout = useCallback(async () => {
    authGenRef.current++;
    if (onlineRetryRef.current) {
      window.removeEventListener("online", onlineRetryRef.current);
      onlineRetryRef.current = null;
    }
    apiClient.auth.logout.$post().catch(() => {});
    clearToken();
    clearStoredTabPreference();
    setIsLoggedIn(false);
    setSyncReady(false);
    setUserId(null);
    queryClient.clear();
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

import { useCallback, useRef, useState } from "react";

import { useQueryClient } from "@tanstack/react-query";

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
  googleLogin: (credential: string) => Promise<void>;
  appleLogin: (credential: string) => Promise<void>;
  register: (loginId: string, password: string) => Promise<void>;
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
    async (loginId: string, password: string) => {
      const res = await apiClient.user.$post({
        json: { loginId, password },
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
    authGenRef.current++;
    if (onlineRetryRef.current) {
      window.removeEventListener("online", onlineRetryRef.current);
      onlineRetryRef.current = null;
    }
    apiClient.auth.logout.$post().catch(() => {});
    clearToken();
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

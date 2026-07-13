import { useCallback, useEffect, useState } from "react";

import { useQuery, useQueryClient } from "@tanstack/react-query";

import { adminClient, setOnUnauthorized } from "../utils/apiClient";

type AdminUser = {
  email: string;
  name: string;
};

type AdminAuthState = {
  isLoading: boolean;
  isLoggedIn: boolean;
  user: AdminUser | null;
  googleLogin: (credential: string) => Promise<void>;
  devLogin: () => Promise<void>;
  logout: () => Promise<void>;
  error: string | null;
};

function isAdminUser(v: unknown): v is AdminUser {
  if (typeof v !== "object" || v === null) return false;
  return (
    "email" in v &&
    typeof v.email === "string" &&
    "name" in v &&
    typeof v.name === "string"
  );
}

const ADMIN_SESSION_QUERY_KEY: readonly ["admin", "session"] = [
  "admin",
  "session",
];

async function fetchAdminSession(): Promise<AdminUser | null> {
  const response = await adminClient.admin.auth.session.$get();
  if (!response.ok) return null;
  const value: unknown = await response.json();
  return isAdminUser(value) ? value : null;
}

export function useAdminAuth(): AdminAuthState {
  const queryClient = useQueryClient();
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sessionQuery = useQuery({
    queryKey: ADMIN_SESSION_QUERY_KEY,
    queryFn: fetchAdminSession,
    retry: false,
  });
  const user = sessionQuery.data ?? null;

  useEffect(() => {
    setOnUnauthorized(() => {
      queryClient.setQueryData(ADMIN_SESSION_QUERY_KEY, null);
    });
    return () => setOnUnauthorized(null);
  }, [queryClient]);

  const googleLogin = useCallback(
    async (credential: string) => {
      setError(null);
      setIsActionLoading(true);
      try {
        const response = await adminClient.admin.auth.google.$post({
          json: { credential },
        });
        if (!response.ok) throw new Error(`API error: ${response.status}`);
        const res = await response.json();

        const adminUser = { email: res.email, name: res.name };
        queryClient.setQueryData(ADMIN_SESSION_QUERY_KEY, adminUser);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "ログインに失敗しました";
        setError(msg);
        throw e;
      } finally {
        setIsActionLoading(false);
      }
    },
    [queryClient],
  );

  const devLogin = useCallback(async () => {
    setError(null);
    setIsActionLoading(true);
    try {
      const response = await adminClient.admin.auth["dev-login"].$post({
        json: {},
      });
      if (!response.ok) throw new Error(`API error: ${response.status}`);
      const res = await response.json();

      const adminUser = { email: res.email, name: res.name };
      queryClient.setQueryData(ADMIN_SESSION_QUERY_KEY, adminUser);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "ログインに失敗しました";
      setError(msg);
      throw e;
    } finally {
      setIsActionLoading(false);
    }
  }, [queryClient]);

  const logout = useCallback(async () => {
    try {
      await adminClient.admin.auth.logout.$post({ json: {} });
    } finally {
      queryClient.setQueryData(ADMIN_SESSION_QUERY_KEY, null);
    }
  }, [queryClient]);

  return {
    isLoading: sessionQuery.isPending || isActionLoading,
    isLoggedIn: !!user,
    user,
    googleLogin,
    devLogin,
    logout,
    error,
  };
}

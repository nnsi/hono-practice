import { useCallback, useEffect, useState } from "react";

import {
  adminPost,
  getAdminToken,
  setAdminToken,
  setOnUnauthorized,
} from "../utils/apiClient";

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
  logout: () => void;
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

export function useAdminAuth(): AdminAuthState {
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<AdminUser | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setOnUnauthorized(() => {
      setUser(null);
    });

    const savedToken = localStorage.getItem("admin_token");
    const savedUser = localStorage.getItem("admin_user");
    if (savedToken && savedUser) {
      try {
        const parsed: unknown = JSON.parse(savedUser);
        if (isAdminUser(parsed)) {
          setAdminToken(savedToken);
          setUser(parsed);
        } else {
          setAdminToken(null);
          localStorage.removeItem("admin_token");
          localStorage.removeItem("admin_user");
        }
      } catch {
        setAdminToken(null);
        localStorage.removeItem("admin_token");
        localStorage.removeItem("admin_user");
      }
    }
    setIsLoading(false);
  }, []);

  const googleLogin = useCallback(async (credential: string) => {
    setError(null);
    setIsLoading(true);
    try {
      const res = await adminPost<{
        token: string;
        email: string;
        name: string;
      }>("/admin/auth/google", { credential });

      setAdminToken(res.token);
      localStorage.setItem("admin_token", res.token);

      const adminUser = { email: res.email, name: res.name };
      setUser(adminUser);
      localStorage.setItem("admin_user", JSON.stringify(adminUser));
    } catch (e) {
      const msg = e instanceof Error ? e.message : "ログインに失敗しました";
      setError(msg);
      throw e;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const devLogin = useCallback(async () => {
    setError(null);
    setIsLoading(true);
    try {
      const res = await adminPost<{
        token: string;
        email: string;
        name: string;
      }>("/admin/auth/dev-login", {});

      setAdminToken(res.token);
      localStorage.setItem("admin_token", res.token);

      const adminUser = { email: res.email, name: res.name };
      setUser(adminUser);
      localStorage.setItem("admin_user", JSON.stringify(adminUser));
    } catch (e) {
      const msg = e instanceof Error ? e.message : "ログインに失敗しました";
      setError(msg);
      throw e;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    setAdminToken(null);
    setUser(null);
    localStorage.removeItem("admin_token");
    localStorage.removeItem("admin_user");
  }, []);

  return {
    isLoading,
    isLoggedIn: !!user && !!getAdminToken(),
    user,
    googleLogin,
    devLogin,
    logout,
    error,
  };
}

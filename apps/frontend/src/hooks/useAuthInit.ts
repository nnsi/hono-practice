import type { MutableRefObject } from "react";
import { useEffect } from "react";

import { db } from "../db/schema";
import { clearLocalData, performInitialSync } from "../sync/initialSync";
import {
  apiClient,
  clearToken,
  setOnAuthExpired,
  setToken,
} from "../utils/apiClient";

type AuthInitDeps = {
  setUserId: (id: string | null) => void;
  setIsLoggedIn: (v: boolean) => void;
  setIsLoading: (v: boolean) => void;
  setSyncReady: (v: boolean) => void;
  authGenRef: MutableRefObject<number>;
  onlineRetryRef: MutableRefObject<(() => void) | null>;
};

export function useAuthInit(deps: AuthInitDeps): void {
  useEffect(() => {
    const {
      setUserId,
      setIsLoggedIn,
      setIsLoading,
      setSyncReady,
      authGenRef,
      onlineRetryRef,
    } = deps;

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
      await db.authState.update("current", { plan: user.plan });

      setSyncReady(true);
      return true;
    };

    const init = async () => {
      const offlineOk = await tryOfflineAuth();
      if (offlineOk) {
        setIsLoading(false);
        try {
          await serverRefreshAndSync();
        } catch {
          const handler = () => {
            window.removeEventListener("online", handler);
            serverRefreshAndSync()
              .then(() => {
                onlineRetryRef.current = null;
              })
              .catch(() => {
                if (onlineRetryRef.current === handler) {
                  window.addEventListener("online", handler);
                }
              });
          };
          onlineRetryRef.current = handler;
          window.addEventListener("online", handler);
        }
      } else {
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

    // リフレッシュトークンが回復不能な失敗(400/401/403等)をした場合の強制ログアウト
    setOnAuthExpired(() => {
      authGenRef.current++;
      clearToken();
      setIsLoggedIn(false);
      setSyncReady(false);
      setUserId(null);
      db.authState.update("current", { lastLoginAt: "" });
    });

    return () => {
      if (onlineRetryRef.current) {
        window.removeEventListener("online", onlineRetryRef.current);
        onlineRetryRef.current = null;
      }
      setOnAuthExpired(null);
    };
  }, []);
}

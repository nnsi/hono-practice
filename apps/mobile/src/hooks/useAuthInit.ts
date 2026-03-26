import type { MutableRefObject } from "react";
import { useEffect } from "react";

import NetInfo from "@react-native-community/netinfo";
import { AppState } from "react-native";

import { getDatabase } from "../db/database";
import { provisionVoiceApiKey } from "../lib/provisionVoiceApiKey";
import { clearLocalData, performInitialSync } from "../sync/initialSync";
import { loadStorageCache } from "../sync/rnPlatformAdapters";
import {
  apiRefreshToken,
  clearToken,
  setOnAuthExpired,
  setToken,
} from "../utils/apiClient";
import { apiGetMe } from "../utils/authApi";
import { reportError } from "../utils/errorReporter";

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
      const planDb = await getDatabase();
      const plan = user.plan ?? "free";
      await planDb.runAsync(
        "UPDATE auth_state SET plan = ? WHERE id = 'current'",
        [plan],
      );
      if (plan === "premium") {
        provisionVoiceApiKey().catch(() => {});
      }
      setSyncReady(true);
      return true;
    };

    // オンライン復帰時に serverRefreshAndSync をリトライ（最大2回）
    const registerOnlineRetry = (isLastAttempt: boolean) => {
      let unsub: (() => void) | null = null;
      unsub = NetInfo.addEventListener((state) => {
        if (!state.isConnected) return;
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

    // フォアグラウンド復帰時にplanを同期 + APIキー自動プロビジョニング
    const appStateSub = AppState.addEventListener("change", (nextState) => {
      if (nextState !== "active") return;
      apiGetMe()
        .then(async (user) => {
          const plan = user.plan ?? "free";
          const db = await getDatabase();
          await db.runAsync(
            "UPDATE auth_state SET plan = ? WHERE id = 'current'",
            [plan],
          );
          if (plan === "premium") {
            await provisionVoiceApiKey();
          }
        })
        .catch(() => {
          // オフラインなら無視
        });
    });

    // リフレッシュトークンが回復不能な失敗(400/401/403等)をした場合の強制ログアウト
    setOnAuthExpired(() => {
      authGenRef.current++;
      clearToken();
      setIsLoggedIn(false);
      setSyncReady(false);
      setUserId(null);
      getDatabase().then((db) =>
        db.runAsync(
          "UPDATE auth_state SET last_login_at = '' WHERE id = 'current'",
        ),
      );
    });

    return () => {
      appStateSub.remove();
      onlineRetryRef.current?.();
      onlineRetryRef.current = null;
      setOnAuthExpired(null);
    };
  }, []);
}

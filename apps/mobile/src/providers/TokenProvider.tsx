import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  useEffect,
  type ReactNode,
} from "react";

import { AppState, type AppStateStatus } from "react-native";

import { calculateRefreshTime, tokenStore } from "@packages/frontend-shared";

import { eventBus } from "../utils/eventBus";

type TokenContextType = {
  accessToken: string | null;
  setAccessToken: (token: string | null) => void;
  clearTokens: () => void;
  scheduleTokenRefresh: (token: string) => void;
};

const TokenContext = createContext<TokenContextType | undefined>(undefined);

export function TokenProvider({ children }: { children: ReactNode }) {
  const [accessToken, setAccessTokenState] = useState<string | null>(null);
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const setAccessToken = useCallback((token: string | null) => {
    console.log("Setting access token:", token ? "present" : "null");
    setAccessTokenState(token);
    tokenStore.setToken(token);
  }, []);

  const clearTokens = useCallback(() => {
    console.log("Clearing tokens");
    setAccessToken(null);
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
      refreshTimeoutRef.current = null;
    }
  }, [setAccessToken]);

  const scheduleTokenRefresh = useCallback((token: string) => {
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
    }

    const refreshTime = calculateRefreshTime(token);
    if (!refreshTime) {
      console.error("Failed to calculate refresh time");
      return;
    }

    console.log(`Scheduling token refresh in ${refreshTime / 1000} seconds`);

    refreshTimeoutRef.current = setTimeout(() => {
      console.log("Token refresh timer triggered");
      // イベントを発火してAuthContextでリフレッシュ処理を行う
      eventBus.emit("token-refreshed", token);
    }, refreshTime);
  }, []);

  // AppStateの変更を監視
  useEffect(() => {
    const subscription = AppState.addEventListener(
      "change",
      (nextAppState: AppStateStatus) => {
        if (nextAppState === "active" && accessToken) {
          console.log("App became active, checking token validity");

          // トークンの有効期限をチェック
          const refreshTime = calculateRefreshTime(accessToken);
          if (refreshTime && refreshTime <= 0) {
            // トークンの有効期限が切れている場合、即座にリフレッシュ
            console.log("Token expired, triggering immediate refresh");
            eventBus.emit("token-refreshed", accessToken);
          } else if (refreshTime) {
            // まだ有効な場合は、リフレッシュを再スケジュール
            console.log("Token still valid, rescheduling refresh");
            scheduleTokenRefresh(accessToken);
          }
        }
      },
    );

    return () => {
      subscription.remove();
    };
  }, [accessToken, scheduleTokenRefresh]);

  return (
    <TokenContext.Provider
      value={{ accessToken, setAccessToken, clearTokens, scheduleTokenRefresh }}
    >
      {children}
    </TokenContext.Provider>
  );
}

export function useToken() {
  const context = useContext(TokenContext);
  if (context === undefined) {
    throw new Error("useToken must be used within a TokenProvider");
  }
  return context;
}

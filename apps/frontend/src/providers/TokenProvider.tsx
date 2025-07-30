import {
  type ReactNode,
  createContext,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import { AppEvents } from "@frontend/services/abstractions";
import { tokenStore as defaultTokenStore } from "@frontend/utils/tokenStore";

import type { EventBus, TimeProvider } from "@frontend/services/abstractions";
import type { TokenStorage } from "@packages/frontend-shared/types";

type TokenState = {
  accessToken: string | null;
  setAccessToken: (token: string | null) => void;
  clearTokens: () => void;
  scheduleTokenRefresh: (expiresIn?: number) => void;
};

type TokenProviderProps = {
  children: ReactNode;
  tokenStore?: TokenStorage;
  timeProvider?: TimeProvider;
  eventBus?: EventBus;
};

export const TokenContext = createContext<TokenState | undefined>(undefined);

export const TokenProvider: React.FC<TokenProviderProps> = ({
  children,
  tokenStore = defaultTokenStore,
  timeProvider,
  eventBus,
}) => {
  const [accessToken, setAccessTokenState] = useState<string | null>(() => {
    // 初期値としてtokenStoreから読み込む
    return tokenStore.getToken();
  });
  const refreshTimeoutRef = useRef<number | NodeJS.Timeout | null>(null);

  const setAccessToken = useCallback((token: string | null) => {
    setAccessTokenState(token);
    tokenStore.setToken(token);
  }, []);

  const clearTokens = useCallback(() => {
    setAccessToken(null);
    if (refreshTimeoutRef.current) {
      if (timeProvider) {
        timeProvider.clearTimeout(refreshTimeoutRef.current as number);
      } else {
        clearTimeout(refreshTimeoutRef.current as NodeJS.Timeout);
      }
      refreshTimeoutRef.current = null;
    }
  }, []);

  const scheduleTokenRefresh = useCallback(
    (expiresIn: number = 15 * 60) => {
      // E2E環境ではトークンリフレッシュのスケジューリングをスキップ
      const isE2E = import.meta.env.VITE_E2E_TEST === "true";
      if (isE2E) {
        console.log("Skipping token refresh scheduling in E2E environment");
        return;
      }

      // Clear any existing timeout
      if (refreshTimeoutRef.current) {
        if (timeProvider) {
          timeProvider.clearTimeout(refreshTimeoutRef.current as number);
        } else {
          clearTimeout(refreshTimeoutRef.current as NodeJS.Timeout);
        }
      }

      // Schedule refresh 1 minute before expiration (14 minutes)
      const refreshTime = (expiresIn - 60) * 1000;

      const triggerRefresh = () => {
        // This will trigger token refresh in AuthProvider
        if (eventBus) {
          eventBus.emit(AppEvents.TOKEN_REFRESH_NEEDED);
        } else {
          window.dispatchEvent(new Event("token-refresh-needed"));
        }
      };

      if (timeProvider) {
        refreshTimeoutRef.current = timeProvider.setTimeout(
          triggerRefresh,
          refreshTime,
        );
      } else {
        refreshTimeoutRef.current = setTimeout(triggerRefresh, refreshTime);
      }
    },
    [eventBus, timeProvider],
  );

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (refreshTimeoutRef.current) {
        if (timeProvider) {
          timeProvider.clearTimeout(refreshTimeoutRef.current as number);
        } else {
          clearTimeout(refreshTimeoutRef.current as NodeJS.Timeout);
        }
      }
    };
  }, [timeProvider]);

  return (
    <TokenContext.Provider
      value={{
        accessToken,
        setAccessToken,
        clearTokens,
        scheduleTokenRefresh,
      }}
    >
      {children}
    </TokenContext.Provider>
  );
};

import {
  type ReactNode,
  createContext,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import { tokenStore } from "@frontend/utils/tokenStore";

type TokenState = {
  accessToken: string | null;
  setAccessToken: (token: string | null) => void;
  clearTokens: () => void;
  scheduleTokenRefresh: (expiresIn?: number) => void;
};

type TokenProviderProps = {
  children: ReactNode;
};

export const TokenContext = createContext<TokenState | undefined>(undefined);

export const TokenProvider: React.FC<TokenProviderProps> = ({ children }) => {
  const [accessToken, setAccessTokenState] = useState<string | null>(null);
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const setAccessToken = useCallback((token: string | null) => {
    setAccessTokenState(token);
    tokenStore.setToken(token);
  }, []);

  const clearTokens = useCallback(() => {
    setAccessToken(null);
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
      refreshTimeoutRef.current = null;
    }
  }, []);

  const scheduleTokenRefresh = useCallback((expiresIn: number = 15 * 60) => {
    // Clear any existing timeout
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
    }

    // Schedule refresh 1 minute before expiration (14 minutes)
    const refreshTime = (expiresIn - 60) * 1000;
    refreshTimeoutRef.current = setTimeout(() => {
      // This will trigger token refresh in AuthProvider
      window.dispatchEvent(new Event("token-refresh-needed"));
    }, refreshTime);
  }, []);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
    };
  }, []);

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

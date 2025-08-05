import {
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

import { AppEvents } from "@frontend/services/abstractions";
import { apiClient as defaultApiClient } from "@frontend/utils/apiClient";

import type { LoginRequest } from "@dtos/request/LoginRequest";
import type { GetUserResponse } from "@dtos/response/GetUserResponse";

import { TokenContext } from "./TokenProvider";

import type { EventBus } from "@frontend/services/abstractions";

type UserState = GetUserResponse | null;

type RequestStatus = "idle" | "loading";

type AuthState =
  | {
      user: UserState;
      getUser: () => Promise<void>;
      login: ({ login_id, password }: LoginRequest) => Promise<void>;
      logout: () => Promise<void>;
      refreshToken: () => Promise<void>;
      requestStatus: RequestStatus;
      setUser: (user: UserState) => void;
      setAccessToken: (token: string | null) => void;
      scheduleTokenRefresh: (expiresIn?: number) => void;
      isInitialized: boolean;
    }
  | undefined;

type AuthProviderProps = {
  children: ReactNode;
  apiClient?: typeof defaultApiClient;
  eventBus?: EventBus;
};

export const AuthContext = createContext<AuthState>(undefined);

export const AuthProvider: React.FC<AuthProviderProps> = ({
  children,
  apiClient = defaultApiClient,
  eventBus,
}) => {
  const tokenContext = useContext(TokenContext);
  if (!tokenContext) {
    throw new Error("AuthProvider must be used within TokenProvider");
  }
  const { setAccessToken, clearTokens, scheduleTokenRefresh } = tokenContext;

  const [user, setUser] = useState<UserState>(null);
  const [requestStatus, setRequestStatus] = useState<RequestStatus>("idle");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isGettingUser, setIsGettingUser] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  const getUser = async () => {
    if (isGettingUser || requestStatus === "loading") return;
    setIsGettingUser(true);
    try {
      setRequestStatus("loading");
      const res = await apiClient.user.me.$get();
      if (res.status > 300) {
        setRequestStatus("idle");
        setUser(null);
        setIsGettingUser(false);
        return;
      }
      const userInfo = await res.json();
      if ("message" in userInfo) {
        setUser(null);
        setIsGettingUser(false);
        return;
      }
      setUser(userInfo);
    } catch (e) {
      setRequestStatus("idle");
      setUser(null);
      setIsGettingUser(false);
      return;
    }
    setRequestStatus("idle");
    setIsGettingUser(false);
  };

  const refreshToken = useCallback(async () => {
    if (isRefreshing) return;

    // E2E環境ではリフレッシュトークンの処理をスキップ
    const isE2E = import.meta.env.VITE_E2E_TEST === "true";
    if (isE2E) {
      console.log("Skipping token refresh in E2E environment");
      return;
    }

    setIsRefreshing(true);
    try {
      const res = await apiClient.auth.token.$post({});
      if (res.status !== 200) {
        const body: any = await res.json().catch(() => ({}));
        if (
          res.status === 401 &&
          body &&
          (body.message === "refresh token not found" ||
            body.message === "invalid refresh token")
        ) {
          setUser(null);
          clearTokens();
          setIsRefreshing(false);
          return;
        }
        throw new Error("Failed to refresh token");
      }
      const data = await res.json();
      setAccessToken(data.token);
      scheduleTokenRefresh();
    } catch (e) {
      setIsRefreshing(false);
      throw e;
    }
    setIsRefreshing(false);
  }, [isRefreshing, setAccessToken, clearTokens, scheduleTokenRefresh]);

  const login = async ({ login_id, password }: LoginRequest) => {
    try {
      const res = await apiClient.auth.login.$post({
        json: {
          login_id,
          password,
        },
      });
      if (res.status !== 200) {
        return Promise.reject("Login failed");
      }
      const data = await res.json();
      setAccessToken(data.token);
      scheduleTokenRefresh();
      await getUser();
    } catch (e) {
      return Promise.reject(e);
    }
    return Promise.resolve();
  };

  const logout = async () => {
    try {
      await apiClient.auth.logout.$post({});
    } catch (e) {
    } finally {
      setUser(null);
      clearTokens();
      setRequestStatus("idle");
    }
  };

  // Fetch token on mount
  useEffect(() => {
    const fetchInitialToken = async () => {
      try {
        // E2E環境でlocalStorageからトークンを復元
        const isE2E = import.meta.env.VITE_E2E_TEST === "true";
        if (isE2E) {
          const storedToken = localStorage.getItem("actiko-access-token");
          if (storedToken) {
            setAccessToken(storedToken);
            scheduleTokenRefresh();
            await getUser();
          }
          // E2E環境では/auth/tokenへのリクエストをスキップ
        } else {
          const res = await apiClient.auth.token.$post({});
          if (res.status === 200) {
            const data = await res.json();
            setAccessToken(data.token);
            scheduleTokenRefresh();
            await getUser();
          }
        }
      } catch (e) {
        // User is not logged in
      } finally {
        // Mark as initialized after the initial token check
        setIsInitialized(true);
      }
    };

    fetchInitialToken();
  }, [setAccessToken, scheduleTokenRefresh]);

  // Listen for token refresh events
  useEffect(() => {
    const handleTokenRefresh = () => {
      refreshToken();
    };

    const handleTokenRefreshed = (event: CustomEvent<string>) => {
      setAccessToken(event.detail);
      scheduleTokenRefresh();
    };

    if (eventBus) {
      const unsubscribeRefreshNeeded = eventBus.on(
        AppEvents.TOKEN_REFRESH_NEEDED,
        handleTokenRefresh,
      );
      const unsubscribeRefreshed = eventBus.on(
        AppEvents.TOKEN_REFRESHED,
        (event) => handleTokenRefreshed(event),
      );

      return () => {
        unsubscribeRefreshNeeded();
        unsubscribeRefreshed();
      };
    }
    window.addEventListener("token-refresh-needed", handleTokenRefresh);
    window.addEventListener(
      "token-refreshed",
      handleTokenRefreshed as EventListener,
    );

    return () => {
      window.removeEventListener("token-refresh-needed", handleTokenRefresh);
      window.removeEventListener(
        "token-refreshed",
        handleTokenRefreshed as EventListener,
      );
    };
  }, [refreshToken, setAccessToken, scheduleTokenRefresh]);

  return (
    <AuthContext.Provider
      value={{
        user,
        getUser,
        login,
        logout,
        refreshToken,
        requestStatus,
        setUser,
        setAccessToken,
        scheduleTokenRefresh,
        isInitialized,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

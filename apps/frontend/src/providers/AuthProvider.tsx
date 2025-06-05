import {
  type ReactNode,
  createContext,
  useState,
  useCallback,
  useEffect,
  useContext,
} from "react";

import { apiClient } from "@frontend/utils/apiClient";

import type { LoginRequest } from "@dtos/request/LoginRequest";
import type { GetUserResponse } from "@dtos/response/GetUserResponse";

import { TokenContext } from "./TokenProvider";

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
    }
  | undefined;

type AuthProviderProps = {
  children: ReactNode;
};

export const AuthContext = createContext<AuthState>(undefined);

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const tokenContext = useContext(TokenContext);
  if (!tokenContext) {
    throw new Error("AuthProvider must be used within TokenProvider");
  }
  const { setAccessToken, clearTokens, scheduleTokenRefresh } = tokenContext;

  const [user, setUser] = useState<UserState>(null);
  const [requestStatus, setRequestStatus] = useState<RequestStatus>("idle");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isGettingUser, setIsGettingUser] = useState(false);

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
      console.error("Logout failed:", e);
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
        const res = await apiClient.auth.token.$post({});
        if (res.status === 200) {
          const data = await res.json();
          setAccessToken(data.token);
          scheduleTokenRefresh();
          await getUser();
        }
      } catch (e) {
        // User is not logged in
        console.log("No valid session");
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

    window.addEventListener("token-refresh-needed", handleTokenRefresh);
    window.addEventListener("token-refreshed", handleTokenRefreshed);

    return () => {
      window.removeEventListener("token-refresh-needed", handleTokenRefresh);
      window.removeEventListener("token-refreshed", handleTokenRefreshed);
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
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

import { type ReactNode, createContext, useState } from "react";

import { apiClient } from "@frontend/utils/apiClient";

import type { LoginRequest } from "@dtos/request/LoginRequest";

type UserState = {
  token: string | null;
} | null;

type RequestStatus = "idle" | "loading";

type AuthState =
  | {
      user: UserState;
      getUser: () => Promise<void>;
      login: ({ login_id, password }: LoginRequest) => Promise<void>;
      logout: () => Promise<void>;
      requestStatus: RequestStatus;
    }
  | undefined;

type AuthProviderProps = {
  children: ReactNode;
};

export const AuthContext = createContext<AuthState>(undefined);

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const token = localStorage.getItem("token");
  const [user, setUser] = useState<UserState>({ token });
  const [requestStatus, setRequestStatus] = useState<RequestStatus>("loading");

  const getUser = async () => {
    try {
      setRequestStatus("loading");
      const res = await apiClient.user.me.$get();
      console.log(res.status);
      if (res.status > 300) {
        setRequestStatus("idle");
        return setUser({ token: localStorage.getItem("token") });
      }
    } catch (e) {
      console.log("AuthProvider", e);
    }
    setRequestStatus("idle");

    return setUser(null);
  };

  const login = async ({ login_id, password }: LoginRequest) => {
    try {
      const res = await apiClient.auth.login.$post({
        json: {
          login_id,
          password,
        },
      });
      if (res.status === 200) {
        const json = await res.json();
        localStorage.setItem("token", json.token);
        setUser(json);
      } else {
        return Promise.reject("Login failed");
      }
    } catch (e) {
      return Promise.reject(e);
    }
    return Promise.resolve();
  };

  const logout = async () => {
    try {
      await apiClient.auth.logout.$get();
      setUser(null);
      setRequestStatus("idle");
      localStorage.removeItem("token");
    } catch (e) {
      return Promise.reject(e);
    }
  };

  return (
    <AuthContext.Provider
      value={{ user, getUser, login, logout, requestStatus }}
    >
      {children}
    </AuthContext.Provider>
  );
};

import { type ReactNode, createContext, useState } from "react";

import { apiClient } from "@frontend/utils/apiClient";

import type { LoginRequest } from "@dtos/request/LoginRequest";

type UserState = {
  token: string | null;
} | null;

type AuthState =
  | {
      user: UserState;
      getUser: () => Promise<void>;
      login: ({ login_id, password }: LoginRequest) => Promise<void>;
      logout: () => Promise<void>;
    }
  | undefined;

type AuthProviderProps = {
  children: ReactNode;
};

export const AuthContext = createContext<AuthState>(undefined);

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const token = localStorage.getItem("token");
  const [user, setUser] = useState<UserState>({ token });

  const getUser = async () => {
    try {
      const res = await apiClient.user.me.$get();
      if (res.status === 204) {
        return setUser({ token });
      }
    } catch (e) {
      console.log("AuthProvider", e);
    }

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
      localStorage.removeItem("token");
    } catch (e) {
      return Promise.reject(e);
    }
  };

  return (
    <AuthContext.Provider value={{ user, getUser, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

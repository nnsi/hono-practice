import { type ReactNode, createContext, useState } from "react";

import { apiClient } from "@/frontend/src/utils/apiClient";
import type { LoginRequest } from "@/types/request/LoginRequest";

type UserState = {
  id: string;
  name: string | null;
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
  const [user, setUser] = useState<UserState>(null);

  const getUser = async () => {
    try {
      const res = await apiClient.user.me.$get();
      if (res.status === 200) {
        const json = await res.json();
        setUser(json);
      } else {
        setUser(null);
      }
    } catch (e) {
      console.log(e);
      setUser(null);
    }
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

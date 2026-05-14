import { createContext, useContext } from "react";

import type { Consents } from "@packages/types/request";

export type AuthContextType = {
  isLoggedIn: boolean;
  isLoading: boolean;
  syncReady: boolean;
  userId: string | null;
  login: (loginId: string, password: string) => Promise<void>;
  googleLogin: (credential: string, consents?: Consents) => Promise<void>;
  appleLogin: (credential: string, consents?: Consents) => Promise<void>;
  register: (
    loginId: string,
    password: string,
    consents: Consents,
  ) => Promise<void>;
  logout: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextType>({
  isLoggedIn: false,
  isLoading: true,
  syncReady: false,
  userId: null,
  login: async () => {},
  googleLogin: async (_credential, _consents) => {},
  appleLogin: async (_credential, _consents) => {},
  register: async (_loginId, _password, _consents) => {},
  logout: async () => {},
});

export function useAuthContext() {
  return useContext(AuthContext);
}

import { useAuthBootstrap, useAuthController } from "@packages/auth-client";
import type { Consents } from "@packages/types/request";

import { authController } from "../auth/authController";

type AuthState = {
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
  logout: () => Promise<{ ok: boolean }>;
};

export function useAuth(): AuthState {
  const state = useAuthController(authController);

  useAuthBootstrap(authController);

  return {
    ...state,
    login: authController.login,
    googleLogin: authController.googleLogin,
    appleLogin: authController.appleLogin,
    register: authController.register,
    logout: authController.logout,
  };
}

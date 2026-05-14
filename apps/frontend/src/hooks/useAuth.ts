import { useEffect } from "react";

import { useAuthBootstrap, useAuthController } from "@packages/auth-client";
import type { Consents } from "@packages/types/request";
import { useQueryClient } from "@tanstack/react-query";

import { authController, setQueryClientReset } from "../auth/authController";

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
  logout: () => Promise<void>;
};

export function useAuth(): AuthState {
  const queryClient = useQueryClient();
  const state = useAuthController(authController);

  useEffect(() => {
    setQueryClientReset(() => queryClient.clear());
    return () => setQueryClientReset(() => {});
  }, [queryClient]);

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

import { useEffect } from "react";

import { useAuthBootstrap, useAuthController } from "@packages/auth-client";
import type { Consents } from "@packages/types/request";
import { AppState } from "react-native";

import { authController } from "../auth/authController";
import { startMobileAuthDiagnosticFlush } from "../auth/mobileAuthDiagnostics";
import { refreshPlanFromBackend } from "../auth/planReconciliation";
import { provisionVoiceApiKey } from "../lib/provisionVoiceApiKey";

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

export async function refreshForegroundEntitlement(
  userId: string,
): Promise<void> {
  const plan = await refreshPlanFromBackend();
  if (plan === "premium") await provisionVoiceApiKey(userId);
}

export function useAuth(): AuthState {
  const state = useAuthController(authController);

  useEffect(startMobileAuthDiagnosticFlush, []);
  useAuthBootstrap(authController);

  // フォアグラウンド復帰時に plan / voice key を同期
  useEffect(() => {
    const sub = AppState.addEventListener("change", (next) => {
      if (next !== "active" || !state.isLoggedIn || !state.userId) return;
      refreshForegroundEntitlement(state.userId).catch(() => {
        // offline ならスキップ
      });
    });
    return () => sub.remove();
  }, [state.isLoggedIn, state.userId]);

  return {
    ...state,
    login: authController.login,
    googleLogin: authController.googleLogin,
    appleLogin: authController.appleLogin,
    register: authController.register,
    logout: authController.logout,
  };
}

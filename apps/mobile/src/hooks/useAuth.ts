import { useEffect } from "react";

import { useAuthBootstrap, useAuthController } from "@packages/auth-client";
import type { Consents } from "@packages/types/request";
import { AppState } from "react-native";

import { authController } from "../auth/authController";
import { provisionVoiceApiKey } from "../lib/provisionVoiceApiKey";
import { apiGetMe } from "../utils/authApi";

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
  const state = useAuthController(authController);

  useAuthBootstrap(authController);

  // フォアグラウンド復帰時に plan / voice key を同期
  useEffect(() => {
    const sub = AppState.addEventListener("change", (next) => {
      if (next !== "active" || !state.isLoggedIn) return;
      apiGetMe()
        .then((user) => {
          if (user.plan === "premium") {
            return provisionVoiceApiKey();
          }
        })
        .catch(() => {
          // offline ならスキップ
        });
    });
    return () => sub.remove();
  }, [state.isLoggedIn]);

  return {
    ...state,
    login: authController.login,
    googleLogin: authController.googleLogin,
    appleLogin: authController.appleLogin,
    register: authController.register,
    logout: authController.logout,
  };
}

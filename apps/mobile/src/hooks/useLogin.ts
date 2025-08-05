import { Alert } from "react-native";

import {
  createReactNativeFormAdapter,
  createReactNativeNavigationAdapter,
  createReactNativeNotificationAdapter,
} from "@packages/frontend-shared/adapters";
import {
  createUseGoogleAuth,
  createUseLogin as createUseLoginApi,
} from "@packages/frontend-shared/hooks";
import {
  createLoginValidation,
  createUseLogin,
} from "@packages/frontend-shared/hooks/feature";
import { useNavigation } from "@react-navigation/native";
import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";

import { apiClient } from "../utils/apiClient";

import { useAuth } from "./useAuth";

import type { LoginRequest } from "@packages/types";

WebBrowser.maybeCompleteAuthSession();

// モバイル版のログインフック
export const useLogin = () => {
  const { login, setUser, setAccessToken, scheduleTokenRefresh } = useAuth();
  const navigation = useNavigation();

  // Form adapter
  const form = createReactNativeFormAdapter<LoginRequest>();

  // API hooks
  const loginApi = createUseLoginApi({ apiClient });
  const googleAuth = createUseGoogleAuth({ apiClient });

  // Google Sign-In setup for mobile
  const [request, response, promptAsync] = Google.useAuthRequest({
    clientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID || "",
    scopes: ["openid", "profile", "email"],
  });

  // Create dependencies
  const dependencies = {
    form,
    navigation: createReactNativeNavigationAdapter(navigation as any),
    notification: createReactNativeNotificationAdapter(Alert),
    auth: {
      login: async (data: LoginRequest) => {
        const result = await loginApi.mutateAsync(data);
        setAccessToken(result.token);
        scheduleTokenRefresh();
        setUser(result.user);
      },
      googleLogin: async (credential: string) => {
        const result = await googleAuth.mutateAsync(credential);
        return result;
      },
      setUser,
      setAccessToken,
      scheduleTokenRefresh,
    },
  };

  // Use the common hook
  const loginHook = createUseLogin(dependencies);

  // Override mobile Google login
  const handleMobileGoogleLogin = async () => {
    try {
      const result = await promptAsync();
      if (result?.type === "success" && result.authentication?.accessToken) {
        // Exchange access token for ID token on the server
        await loginHook.handleGoogleSuccess({
          credential: result.authentication.accessToken,
        });
      }
    } catch (error) {
      loginHook.handleGoogleError();
    }
  };

  return {
    ...loginHook,
    handleMobileGoogleLogin,
    googleSignInReady: !!request,
  };
};

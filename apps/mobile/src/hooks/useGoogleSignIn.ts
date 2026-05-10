import { useEffect } from "react";

import type { Consents } from "@packages/types/request";
import * as Google from "expo-auth-session/providers/google";
import { Platform } from "react-native";

import { getApiUrl } from "../utils/apiClient";
import { setOAuthPending } from "../utils/oauthPending";

const API_URL = getApiUrl();

export function useGoogleSignIn({
  onLogin,
  onError,
  consents,
  intent = "login",
}: {
  onLogin: (idToken: string, consents?: Consents) => Promise<void>;
  onError: (message: string) => void;
  consents?: Consents;
  intent?: "login" | "link";
}) {
  const [googleRequest, googleResponse, googlePromptAsync] =
    Google.useAuthRequest(
      {
        webClientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID ?? "",
        androidClientId:
          process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_ANDROID ??
          process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID ??
          "",
        iosClientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_IOS ?? "",
      },
      Platform.OS === "android"
        ? { native: `${API_URL}/auth/google/callback` }
        : undefined,
    );

  useEffect(() => {
    if (Platform.OS === "android" && googleRequest?.codeVerifier) {
      setOAuthPending({
        codeVerifier: googleRequest.codeVerifier,
        redirectUri: `${API_URL}/auth/google/callback`,
        intent,
        consents,
      });
    }
  }, [googleRequest, intent, consents]);

  useEffect(() => {
    if (googleResponse?.type === "success") {
      const idToken = googleResponse.authentication?.idToken;
      if (idToken) {
        onLogin(idToken, consents).catch((e: unknown) =>
          onError(
            e instanceof Error ? e.message : "Googleログインに失敗しました",
          ),
        );
      }
    }
  }, [googleResponse, onLogin, onError, consents]);

  const handleGooglePress = async () => {
    try {
      await googlePromptAsync();
    } catch {
      onError("Googleログインに失敗しました");
    }
  };

  return { googleRequest, handleGooglePress };
}

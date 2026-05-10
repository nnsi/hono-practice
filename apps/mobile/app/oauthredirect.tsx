import { useEffect, useRef } from "react";

import { useLocalSearchParams, useRouter } from "expo-router";
import { ActivityIndicator, View } from "react-native";

import { useAuthContext } from "../src/contexts/AuthContext";
import { apiClient, setRefreshToken, setToken } from "../src/utils/apiClient";
import { apiGetMe } from "../src/utils/authApi";
import { reportError } from "../src/utils/errorReporter";
import {
  type OAuthPending,
  clearOAuthPending,
  getOAuthPending,
} from "../src/utils/oauthPending";

export default function OAuthRedirect() {
  const params = useLocalSearchParams<{ code?: string; error?: string }>();
  const { completeLogin } = useAuthContext();
  const router = useRouter();
  const processed = useRef(false);

  useEffect(() => {
    if (processed.current) return;
    processed.current = true;

    const code = params.code;
    const pending = getOAuthPending();
    clearOAuthPending();

    if (!code || params.error || !pending) {
      router.replace("/(auth)/login");
      return;
    }

    handleCodeExchange(code, pending).catch((e) => {
      reportError({
        errorType: "unhandled_error",
        message: `[OAuthRedirect] ${e instanceof Error ? e.message : String(e)}`,
        stack: e instanceof Error ? e.stack : undefined,
      });
      router.replace("/(auth)/login");
    });
  }, []);

  async function handleCodeExchange(code: string, pending: OAuthPending) {
    if (pending.intent === "link") {
      const res = await apiClient.auth.google.exchange.link.$post({
        json: {
          code,
          code_verifier: pending.codeVerifier,
          redirect_uri: pending.redirectUri,
        },
      });
      if (!res.ok) throw new Error(`Server error ${res.status}`);
      router.replace("/(tabs)/settings");
      return;
    }

    const res = await apiClient.auth.google.exchange.$post({
      json: {
        code,
        code_verifier: pending.codeVerifier,
        redirect_uri: pending.redirectUri,
        consents: pending.consents,
      },
    });

    if (!res.ok) throw new Error(`Server error ${res.status}`);

    const data = await res.json();
    if (!data.token) throw new Error("No token in response");

    setToken(data.token);
    if ("refreshToken" in data && data.refreshToken) {
      await setRefreshToken(data.refreshToken);
    }
    const user = await apiGetMe();
    await completeLogin(user.id);
  }

  return (
    <View className="flex-1 items-center justify-center bg-white dark:bg-gray-800">
      <ActivityIndicator size="large" />
    </View>
  );
}

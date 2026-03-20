import { useEffect, useRef } from "react";

import { useLocalSearchParams, useRouter } from "expo-router";
import { ActivityIndicator, View } from "react-native";

import { useAuthContext } from "./_layout";
import { clearOAuthPending, getOAuthPending } from "../src/utils/oauthPending";
import { apiGetMe, getApiUrl, setToken } from "../src/utils/apiClient";

const API_URL = getApiUrl();

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
      console.error("[OAuthRedirect]", e);
      router.replace("/(auth)/login");
    });
  }, []);

  async function handleCodeExchange(
    code: string,
    pending: { codeVerifier: string; redirectUri: string },
  ) {
    const res = await fetch(`${API_URL}/auth/google/exchange`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code,
        code_verifier: pending.codeVerifier,
        redirect_uri: pending.redirectUri,
      }),
    });

    if (!res.ok) throw new Error(`Server error ${res.status}`);

    const data = await res.json();
    if (!data.token) throw new Error("No token in response");

    setToken(data.token);
    const user = await apiGetMe();
    await completeLogin(user.id);
  }

  return (
    <View className="flex-1 items-center justify-center bg-white">
      <ActivityIndicator size="large" />
    </View>
  );
}

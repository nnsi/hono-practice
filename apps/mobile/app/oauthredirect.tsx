import { useEffect, useState } from "react";

import { useLocalSearchParams } from "expo-router";
import { ActivityIndicator, Text, View } from "react-native";

import { useAuthContext } from "./_layout";
import { getOAuthPending, clearOAuthPending } from "../src/utils/oauthPending";
import {
  apiGetMe,
  getApiUrl,
  setRefreshToken,
  setToken,
} from "../src/utils/apiClient";

const API_URL = getApiUrl();

export default function OAuthRedirect() {
  const params = useLocalSearchParams<{
    code?: string;
    error?: string;
    error_description?: string;
  }>();
  const { completeLogin } = useAuthContext();
  const [debugInfo, setDebugInfo] = useState("Loading...");
  const [processed, setProcessed] = useState(false);

  useEffect(() => {
    if (processed) return;
    setProcessed(true);

    if (params.error) {
      setDebugInfo(
        `Google OAuth Error:\n${params.error}\n${params.error_description ?? ""}`,
      );
      return;
    }

    const code = params.code;
    if (!code) {
      setDebugInfo(`No code param. All params: ${JSON.stringify(params)}`);
      return;
    }

    const pending = getOAuthPending();
    clearOAuthPending();

    if (!pending) {
      setDebugInfo("No pending OAuth state (codeVerifier lost)");
      return;
    }

    setDebugInfo("Exchanging code...");

    handleCodeExchange(code, pending).catch((e) => {
      setDebugInfo(`Failed: ${e instanceof Error ? e.message : String(e)}`);
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

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Server error ${res.status}: ${text}`);
    }

    const data = await res.json();
    if (!data.token) throw new Error("No token in response");

    setToken(data.token);
    if (data.refreshToken) await setRefreshToken(data.refreshToken);

    const user = await apiGetMe();
    await completeLogin(user.id);
  }

  return (
    <View className="flex-1 items-center justify-center bg-white p-8">
      <ActivityIndicator size="large" />
      <Text className="mt-4 text-sm text-gray-600 text-center">
        {debugInfo}
      </Text>
    </View>
  );
}

import { useEffect, useState } from "react";

import * as AuthSession from "expo-auth-session";
import { useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { Text, TextInput, TouchableOpacity, View } from "react-native";

import { useAuthContext } from "../../../app/_layout";
import { LegalModal } from "../common/LegalModal";

WebBrowser.maybeCompleteAuthSession();

export function LoginForm() {
  const { login, googleLogin } = useAuthContext();
  const router = useRouter();
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [legalModal, setLegalModal] = useState<"privacy" | "terms" | null>(
    null,
  );

  const googleDiscovery = AuthSession.useAutoDiscovery(
    "https://accounts.google.com",
  );

  const redirectUri = AuthSession.makeRedirectUri();

  const [googleRequest, googleResponse, googlePromptAsync] =
    AuthSession.useAuthRequest(
      {
        clientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID ?? "",
        redirectUri,
        scopes: ["openid", "profile", "email"],
        responseType: AuthSession.ResponseType.IdToken,
        usePKCE: false,
      },
      googleDiscovery,
    );

  useEffect(() => {
    if (googleResponse?.type === "success") {
      const idToken = googleResponse.params.id_token;
      if (idToken) {
        googleLogin(idToken).catch((e: unknown) =>
          setError(
            e instanceof Error ? e.message : "Googleログインに失敗しました",
          ),
        );
      }
    }
  }, [googleResponse]);

  const handleLogin = async () => {
    if (!loginId || !password) {
      setError("IDとパスワードを入力してください");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await login(loginId, password);
    } catch (e) {
      setError(e instanceof Error ? e.message : "ログインに失敗しました");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 justify-center px-8 bg-white">
      <Text className="text-3xl font-bold text-center mb-8">Actiko</Text>

      {error ? (
        <Text className="text-red-500 text-center mb-4">{error}</Text>
      ) : null}

      <TextInput
        className="border border-gray-300 rounded-lg px-4 py-3 mb-4 text-base"
        placeholder="ログインID"
        value={loginId}
        onChangeText={setLoginId}
        autoCapitalize="none"
        autoCorrect={false}
      />

      <TextInput
        className="border border-gray-300 rounded-lg px-4 py-3 mb-6 text-base"
        placeholder="パスワード"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      <TouchableOpacity
        className={`bg-blue-500 rounded-lg py-3 items-center ${loading ? "opacity-50" : ""}`}
        onPress={handleLogin}
        disabled={loading}
      >
        <Text className="text-white text-base font-semibold">
          {loading ? "ログイン中..." : "ログイン"}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        className="mt-4 items-center"
        onPress={() => router.push("/(auth)/create-user")}
      >
        <Text className="text-blue-500">アカウントを作成</Text>
      </TouchableOpacity>

      <View className="mt-6 items-center">
        <View className="flex-row items-center mb-4">
          <View className="flex-1 h-px bg-gray-300" />
          <Text className="mx-3 text-gray-400 text-sm">または</Text>
          <View className="flex-1 h-px bg-gray-300" />
        </View>

        <TouchableOpacity
          className="w-full flex-row items-center justify-center py-3 rounded-lg border border-gray-300 bg-white"
          onPress={() => googlePromptAsync()}
          disabled={!googleRequest}
        >
          <Text className="text-base font-medium text-gray-700">
            Googleでログイン
          </Text>
        </TouchableOpacity>
      </View>

      {/* Legal links */}
      <View className="mt-6 flex-row justify-center gap-3">
        <TouchableOpacity onPress={() => setLegalModal("privacy")}>
          <Text className="text-xs text-gray-400 underline">
            プライバシーポリシー
          </Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setLegalModal("terms")}>
          <Text className="text-xs text-gray-400 underline">利用規約</Text>
        </TouchableOpacity>
      </View>
      {legalModal && (
        <LegalModal
          visible={!!legalModal}
          type={legalModal}
          onClose={() => setLegalModal(null)}
        />
      )}
    </View>
  );
}

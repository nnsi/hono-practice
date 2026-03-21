import { useState } from "react";

import * as AppleAuthentication from "expo-apple-authentication";
import { useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { Platform, Text, TouchableOpacity, View } from "react-native";

import { useAuthContext } from "../../../app/_layout";
import { useGoogleSignIn } from "../../hooks/useGoogleSignIn";
import { GoogleMark } from "../common/GoogleMark";
import { IMESafeTextInput } from "../common/IMESafeTextInput";
import { LegalModal } from "../common/LegalModal";

WebBrowser.maybeCompleteAuthSession();

export function CreateUserForm() {
  const { register, googleLogin, appleLogin } = useAuthContext();
  const router = useRouter();
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [legalModal, setLegalModal] = useState<"privacy" | "terms" | null>(
    null,
  );

  const { googleRequest, handleGooglePress } = useGoogleSignIn({
    onLogin: googleLogin,
    onError: setError,
  });

  const handleRegister = async () => {
    if (!loginId || !password) {
      setError("IDとパスワードを入力してください");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await register(loginId, password);
    } catch (e) {
      setError(e instanceof Error ? e.message : "登録に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 justify-center px-8 bg-white">
      <Text className="text-3xl font-bold text-center mb-8">
        アカウント作成
      </Text>

      {error ? (
        <Text className="text-red-500 text-center mb-4">{error}</Text>
      ) : null}

      <TouchableOpacity
        className={`w-full flex-row items-center justify-center rounded-lg border bg-white px-4 mb-3 ${googleRequest ? "" : "opacity-50"}`}
        style={{ minHeight: 48, borderColor: "#747775" }}
        onPress={handleGooglePress}
        disabled={!googleRequest}
        accessibilityRole="button"
        accessibilityLabel="Googleで登録"
      >
        <GoogleMark />
        <Text
          className="text-base font-medium ml-3"
          style={{ color: "#1F1F1F" }}
        >
          Googleで登録
        </Text>
      </TouchableOpacity>

      {Platform.OS === "ios" && (
        <AppleAuthentication.AppleAuthenticationButton
          buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_UP}
          buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
          cornerRadius={8}
          style={{ width: "100%", height: 48, marginBottom: 12 }}
          onPress={async () => {
            try {
              const credential = await AppleAuthentication.signInAsync({
                requestedScopes: [
                  AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
                  AppleAuthentication.AppleAuthenticationScope.EMAIL,
                ],
              });
              if (credential.identityToken) {
                await appleLogin(credential.identityToken);
              }
            } catch (e: unknown) {
              const code =
                e && typeof e === "object" && "code" in e
                  ? (e as { code: string }).code
                  : "";
              if (code !== "ERR_REQUEST_CANCELED") {
                setError(
                  e instanceof Error
                    ? e.message
                    : "Appleアカウントでの登録に失敗しました",
                );
              }
            }
          }}
        />
      )}

      <View className="flex-row items-center mb-4">
        <View className="flex-1 h-px bg-gray-300" />
        <Text className="mx-3 text-gray-400 text-sm">または</Text>
        <View className="flex-1 h-px bg-gray-300" />
      </View>

      <IMESafeTextInput
        className="border border-gray-300 rounded-lg px-4 py-3 mb-4 text-base"
        placeholder="ログインID"
        value={loginId}
        onChangeText={setLoginId}
        autoCapitalize="none"
        autoCorrect={false}
      />
      <IMESafeTextInput
        className="border border-gray-300 rounded-lg px-4 py-3 mb-4 text-base"
        placeholder="パスワード（8文字以上）"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      <Text className="text-xs text-gray-400 leading-5 mb-4">
        新規登録することで、
        <Text className="underline" onPress={() => setLegalModal("terms")}>
          利用規約
        </Text>
        と
        <Text className="underline" onPress={() => setLegalModal("privacy")}>
          プライバシーポリシー
        </Text>
        に同意したものとみなします。
      </Text>

      <TouchableOpacity
        className={`bg-blue-500 rounded-lg py-3 items-center ${loading ? "opacity-50" : ""}`}
        onPress={handleRegister}
        disabled={loading}
      >
        <Text className="text-white text-base font-semibold">
          {loading ? "登録中..." : "登録"}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        className="mt-4 items-center"
        onPress={() => router.back()}
      >
        <Text className="text-blue-500">ログインに戻る</Text>
      </TouchableOpacity>

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

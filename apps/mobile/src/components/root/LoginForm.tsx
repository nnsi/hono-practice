import { useState } from "react";

import { useTranslation } from "@packages/i18n";
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

export function LoginForm() {
  const { t } = useTranslation("common");
  const { login, googleLogin, appleLogin } = useAuthContext();
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

  const handleLogin = async () => {
    if (!loginId || !password) {
      setError(t("auth.idAndPasswordRequired"));
      return;
    }
    setLoading(true);
    setError("");
    try {
      await login(loginId, password);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("auth.loginError"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 justify-center px-8 bg-white dark:bg-gray-800">
      <Text className="text-3xl font-bold text-center mb-8">Actiko</Text>

      {error ? (
        <Text className="text-red-500 dark:text-red-400 text-center mb-4">{error}</Text>
      ) : null}

      <IMESafeTextInput
        className="border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-3 mb-4 text-base"
        placeholder={t("auth.loginId")}
        value={loginId}
        onChangeText={setLoginId}
        autoCapitalize="none"
        autoCorrect={false}
      />

      <IMESafeTextInput
        className="border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-3 mb-6 text-base"
        placeholder={t("auth.password")}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      <TouchableOpacity
        className={`bg-blue-50 dark:bg-blue-900/200 rounded-lg py-3 items-center ${loading ? "opacity-50" : ""}`}
        onPress={handleLogin}
        disabled={loading}
      >
        <Text className="text-white text-base font-semibold">
          {loading ? t("auth.loggingIn") : t("auth.login")}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        className="mt-4 items-center"
        onPress={() => router.push("/(auth)/create-user")}
      >
        <Text className="text-blue-500 dark:text-blue-400">{t("auth.createAccount")}</Text>
      </TouchableOpacity>

      <View className="mt-6 items-center">
        <View className="flex-row items-center mb-4">
          <View className="flex-1 h-px bg-gray-300" />
          <Text className="mx-3 text-gray-400 dark:text-gray-500 text-sm">{t("auth.or")}</Text>
          <View className="flex-1 h-px bg-gray-300" />
        </View>

        <TouchableOpacity
          className={`w-full flex-row items-center justify-center rounded-lg border bg-white dark:bg-gray-800 px-4 ${googleRequest ? "" : "opacity-50"}`}
          style={{ minHeight: 48, borderColor: "#747775" }}
          onPress={handleGooglePress}
          disabled={!googleRequest}
          accessibilityRole="button"
          accessibilityLabel={t("auth.googleLogin")}
        >
          <GoogleMark />
          <Text
            className="text-base font-medium ml-3"
            style={{ color: "#1F1F1F" }}
          >
            {t("auth.googleLogin")}
          </Text>
        </TouchableOpacity>

        {Platform.OS === "ios" && (
          <AppleAuthentication.AppleAuthenticationButton
            buttonType={
              AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN
            }
            buttonStyle={
              AppleAuthentication.AppleAuthenticationButtonStyle.BLACK
            }
            cornerRadius={8}
            style={{ width: "100%", height: 48, marginTop: 12 }}
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
                    e instanceof Error ? e.message : t("auth.appleLoginError"),
                  );
                }
              }
            }}
          />
        )}
      </View>

      <View className="mt-6 flex-row justify-center gap-3">
        <TouchableOpacity onPress={() => setLegalModal("privacy")}>
          <Text className="text-xs text-gray-400 dark:text-gray-500 underline">
            {t("auth.privacyPolicy")}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setLegalModal("terms")}>
          <Text className="text-xs text-gray-400 dark:text-gray-500 underline">
            {t("auth.termsOfService")}
          </Text>
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

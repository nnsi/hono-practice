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

export function CreateUserForm() {
  const { t } = useTranslation("common");
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
      setError(t("auth.idAndPasswordRequired"));
      return;
    }
    setLoading(true);
    setError("");
    try {
      await register(loginId, password);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("auth.registerError"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 justify-center px-8 bg-white dark:bg-gray-800">
      <Text className="text-3xl font-bold text-center mb-8">
        {t("auth.createAccountTitle")}
      </Text>

      {error ? (
        <Text className="text-red-500 dark:text-red-400 text-center mb-4">{error}</Text>
      ) : null}

      <TouchableOpacity
        className={`w-full flex-row items-center justify-center rounded-lg border bg-white dark:bg-gray-800 px-4 mb-3 ${googleRequest ? "" : "opacity-50"}`}
        style={{ minHeight: 48, borderColor: "#747775" }}
        onPress={handleGooglePress}
        disabled={!googleRequest}
        accessibilityRole="button"
        accessibilityLabel={t("auth.googleRegister")}
      >
        <GoogleMark />
        <Text
          className="text-base font-medium ml-3"
          style={{ color: "#1F1F1F" }}
        >
          {t("auth.googleRegister")}
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
                  e instanceof Error ? e.message : t("auth.appleRegisterError"),
                );
              }
            }
          }}
        />
      )}

      <View className="flex-row items-center mb-4">
        <View className="flex-1 h-px bg-gray-300" />
        <Text className="mx-3 text-gray-400 dark:text-gray-500 text-sm">{t("auth.or")}</Text>
        <View className="flex-1 h-px bg-gray-300" />
      </View>

      <IMESafeTextInput
        className="border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-3 mb-4 text-base"
        placeholder={t("auth.loginId")}
        value={loginId}
        onChangeText={setLoginId}
        autoCapitalize="none"
        autoCorrect={false}
      />
      <IMESafeTextInput
        className="border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-3 mb-4 text-base"
        placeholder={t("auth.passwordHint")}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      <Text className="text-xs text-gray-400 dark:text-gray-500 leading-5 mb-4">
        {t("auth.legalConsentPrefix")}
        <Text className="underline" onPress={() => setLegalModal("terms")}>
          {t("auth.termsOfService")}
        </Text>
        {t("auth.legalConsentAnd")}
        <Text className="underline" onPress={() => setLegalModal("privacy")}>
          {t("auth.privacyPolicy")}
        </Text>
        {t("auth.legalConsentSuffix")}
      </Text>

      <TouchableOpacity
        className={`bg-blue-50 dark:bg-blue-900/200 rounded-lg py-3 items-center ${loading ? "opacity-50" : ""}`}
        onPress={handleRegister}
        disabled={loading}
      >
        <Text className="text-white text-base font-semibold">
          {loading ? t("auth.registering") : t("auth.register")}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        className="mt-4 items-center"
        onPress={() => router.back()}
      >
        <Text className="text-blue-500 dark:text-blue-400">{t("auth.backToLogin")}</Text>
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

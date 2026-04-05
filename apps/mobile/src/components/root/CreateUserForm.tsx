import * as AppleAuthentication from "expo-apple-authentication";
import { useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { Check, Square } from "lucide-react-native";
import { Platform, Text, TouchableOpacity, View } from "react-native";

import { useCreateUserForm } from "../../hooks/useCreateUserForm";
import { FormInput } from "../common/FormInput";
import { GoogleMark } from "../common/GoogleMark";
import { LegalModal } from "../common/LegalModal";

WebBrowser.maybeCompleteAuthSession();

export function CreateUserForm() {
  const router = useRouter();
  const {
    t,
    loginId,
    setLoginId,
    password,
    setPassword,
    loading,
    error,
    setError,
    legalModal,
    setLegalModal,
    consentChecked,
    setConsentChecked,
    googleRequest,
    handleGooglePress,
    handleRegister,
    buildAppleConsents,
    appleLogin,
  } = useCreateUserForm();

  return (
    <View className="flex-1 justify-center px-8 bg-white dark:bg-gray-800">
      <Text className="text-3xl font-bold text-center mb-8">
        {t("auth.createAccountTitle")}
      </Text>

      {error ? (
        <Text className="text-red-500 dark:text-red-400 text-center mb-4">
          {error}
        </Text>
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
                await appleLogin(
                  credential.identityToken,
                  buildAppleConsents(),
                );
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

      <Text className="text-xs text-gray-400 dark:text-gray-500 text-center mb-3">
        {t("auth.oauthConsent")}
      </Text>

      <View className="flex-row items-center mb-4">
        <View className="flex-1 h-px bg-gray-300" />
        <Text className="mx-3 text-gray-400 dark:text-gray-500 text-sm">
          {t("auth.or")}
        </Text>
        <View className="flex-1 h-px bg-gray-300" />
      </View>

      <FormInput
        className="mb-4"
        placeholder={t("auth.loginId")}
        value={loginId}
        onChangeText={setLoginId}
        autoCapitalize="none"
        autoCorrect={false}
        accessibilityLabel={t("auth.loginId")}
      />
      <FormInput
        className="mb-4"
        placeholder={t("auth.passwordHint")}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        accessibilityLabel={t("auth.password")}
      />

      <TouchableOpacity
        className="flex-row items-start mb-4"
        onPress={() => setConsentChecked(!consentChecked)}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: consentChecked }}
      >
        <View className="mt-0.5 mr-2">
          {consentChecked ? (
            <Check size={20} color="#111827" />
          ) : (
            <Square size={20} color="#9CA3AF" />
          )}
        </View>
        <Text className="flex-1 text-xs text-gray-500 dark:text-gray-400 leading-5">
          {t("auth.legalConsentPrefix")}
          <Text
            className="underline"
            onPress={() => setLegalModal("terms")}
            accessibilityRole="link"
          >
            {t("auth.termsOfService")}
          </Text>
          {t("auth.legalConsentAnd")}
          <Text
            className="underline"
            onPress={() => setLegalModal("privacy")}
            accessibilityRole="link"
          >
            {t("auth.privacyPolicy")}
          </Text>
          {t("auth.legalConsentSuffix")}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        className={`bg-gray-900 dark:bg-gray-100 rounded-lg py-3 items-center ${loading || !consentChecked ? "opacity-50" : ""}`}
        onPress={handleRegister}
        disabled={loading || !consentChecked}
        accessibilityRole="button"
        accessibilityLabel={
          loading ? t("auth.registering") : t("auth.register")
        }
      >
        <Text className="text-white dark:text-gray-900 text-base font-semibold">
          {loading ? t("auth.registering") : t("auth.register")}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        className="mt-4 items-center"
        onPress={() => router.back()}
        accessibilityRole="link"
        accessibilityLabel={t("auth.backToLogin")}
      >
        <Text className="text-blue-500 dark:text-blue-400">
          {t("auth.backToLogin")}
        </Text>
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

import * as AppleAuthentication from "expo-apple-authentication";
import { Platform, Text, TouchableOpacity, View } from "react-native";

import { ActikoLogo } from "../common/ActikoLogo";
import { FormInput } from "../common/FormInput";
import { GoogleMark } from "../common/GoogleMark";
import { LegalModal } from "../common/LegalModal";
import { useLoginForm } from "./useLoginForm";

export function LoginForm() {
  const {
    t,
    loginId,
    setLoginId,
    password,
    setPassword,
    loading,
    error,
    legalModal,
    setLegalModal,
    googleRequest,
    handleGooglePress,
    handleLogin,
    appleLogin,
    handleAppleError,
    router,
  } = useLoginForm();

  return (
    <View className="flex-1 justify-center px-8 bg-white dark:bg-gray-800">
      <View className="items-center mb-8">
        <ActikoLogo width={200} height={83} />
      </View>

      {error ? (
        <Text className="text-red-500 dark:text-red-400 text-center mb-4">
          {error}
        </Text>
      ) : null}

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
        className="mb-6"
        placeholder={t("auth.password")}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        accessibilityLabel={t("auth.password")}
      />

      <TouchableOpacity
        className={`bg-gray-900 dark:bg-gray-100 rounded-lg py-3 items-center ${loading ? "opacity-50" : ""}`}
        onPress={handleLogin}
        disabled={loading}
        accessibilityRole="button"
        accessibilityLabel={loading ? t("auth.loggingIn") : t("auth.login")}
      >
        <Text className="text-white dark:text-gray-900 text-base font-semibold">
          {loading ? t("auth.loggingIn") : t("auth.login")}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        className="mt-4 items-center"
        onPress={() => router.push("/(auth)/create-user")}
        accessibilityRole="link"
        accessibilityLabel={t("auth.createAccount")}
      >
        <Text className="text-blue-500 dark:text-blue-400">
          {t("auth.createAccount")}
        </Text>
      </TouchableOpacity>

      <View className="mt-6 items-center">
        <View className="flex-row items-center mb-4">
          <View className="flex-1 h-px bg-gray-300" />
          <Text className="mx-3 text-gray-400 dark:text-gray-500 text-sm">
            {t("auth.or")}
          </Text>
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
                handleAppleError(e);
              }
            }}
          />
        )}
      </View>

      <View className="mt-6 flex-row justify-center gap-3">
        <TouchableOpacity
          onPress={() => setLegalModal("privacy")}
          accessibilityRole="link"
          accessibilityLabel={t("auth.privacyPolicy")}
        >
          <Text className="text-xs text-gray-400 dark:text-gray-500 underline">
            {t("auth.privacyPolicy")}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setLegalModal("terms")}
          accessibilityRole="link"
          accessibilityLabel={t("auth.termsOfService")}
        >
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

import { useEffect, useState } from "react";

import { useTranslation } from "@packages/i18n";
import * as Google from "expo-auth-session/providers/google";
import { Link } from "lucide-react-native";
import { Platform, Text, TouchableOpacity, View } from "react-native";

import { apiGetMe, apiGoogleLink } from "../../utils/authApi";
import { setOAuthPending } from "../../utils/oauthPending";
import { GoogleMark } from "../common/GoogleMark";
import { Divider, Section, type ShadowStyle } from "./SettingsParts";

function useGoogleAccount() {
  const [isGoogleLinked, setIsGoogleLinked] = useState(false);
  const [googleEmail, setGoogleEmail] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLinking, setIsLinking] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const [googleRequest, googleResponse, googlePromptAsync] =
    Google.useAuthRequest(
      {
        webClientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID ?? "",
        androidClientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID ?? "",
        iosClientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_IOS ?? "",
      },
      Platform.OS === "android"
        ? {
            native: `${process.env.EXPO_PUBLIC_API_URL}/auth/google/callback`,
          }
        : undefined,
    );

  useEffect(() => {
    if (Platform.OS === "android" && googleRequest?.codeVerifier) {
      setOAuthPending({
        codeVerifier: googleRequest.codeVerifier,
        redirectUri: `${process.env.EXPO_PUBLIC_API_URL}/auth/google/callback`,
      });
    }
  }, [googleRequest]);

  useEffect(() => {
    fetchUserInfo();
  }, []);

  useEffect(() => {
    if (googleResponse?.type === "success") {
      const idToken = googleResponse.authentication?.idToken;
      if (idToken) {
        linkGoogle(idToken);
      }
    }
  }, [googleResponse]);

  const fetchUserInfo = async () => {
    try {
      const user = await apiGetMe();
      setIsGoogleLinked(user.providers?.includes("google") ?? false);
      setGoogleEmail(user.providerEmails?.google ?? null);
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  };

  const linkGoogle = async (credential: string) => {
    setIsLinking(true);
    setMessage(null);
    try {
      await apiGoogleLink(credential);
      await fetchUserInfo();
      setMessage({ type: "success", text: "Googleアカウントを連携しました" });
    } catch (e) {
      setMessage({
        type: "error",
        text: e instanceof Error ? e.message : "連携に失敗しました",
      });
    } finally {
      setIsLinking(false);
    }
  };

  return {
    isGoogleLinked,
    googleEmail,
    isLoading,
    isLinking,
    message,
    googleRequest,
    googlePromptAsync,
  };
}

export function GoogleLinkSection({ shadow }: { shadow: ShadowStyle }) {
  const { t } = useTranslation("settings");
  const google = useGoogleAccount();

  return (
    <Section icon={Link} label="Google連携" shadow={shadow}>
      {google.isLoading ? (
        <View className="px-4 py-3">
          <Text className="text-sm text-gray-500 dark:text-gray-400">読み込み中...</Text>
        </View>
      ) : (
        <View className="px-4 py-3 gap-2">
          {google.isGoogleLinked ? (
            <View className="flex-row items-center gap-2">
              <Text className="text-sm text-green-700 dark:text-green-400 font-medium">
                {t("googleLinked")}
              </Text>
              {google.googleEmail && (
                <Text className="text-xs text-gray-500 dark:text-gray-400">
                  {google.googleEmail}
                </Text>
              )}
            </View>
          ) : (
            <Text className="text-xs text-gray-500 dark:text-gray-400">
              {t("googleLinkDescription")}
            </Text>
          )}
          <TouchableOpacity
            className={`w-full flex-row items-center justify-center rounded-lg border bg-white dark:bg-gray-800 px-4 ${
              google.isLinking || !google.googleRequest ? "opacity-50" : ""
            }`}
            style={{ minHeight: 48, borderColor: "#747775" }}
            onPress={() => google.googlePromptAsync()}
            disabled={google.isLinking || !google.googleRequest}
          >
            <GoogleMark />
            <Text
              className="text-base font-medium ml-3"
              style={{ color: "#1F1F1F" }}
            >
              {google.isLinking
                ? t("linking")
                : google.isGoogleLinked
                  ? "Googleアカウントを変更"
                  : "Googleアカウントを連携"}
            </Text>
          </TouchableOpacity>
        </View>
      )}
      {google.message && (
        <>
          <Divider />
          <View className="px-4 py-2">
            <Text
              className={`text-xs ${google.message.type === "success" ? "text-green-600 dark:text-green-400" : "text-red-500 dark:text-red-400"}`}
            >
              {google.message.text}
            </Text>
          </View>
        </>
      )}
    </Section>
  );
}

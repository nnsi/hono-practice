import { useEffect, useState } from "react";

import * as AppleAuthentication from "expo-apple-authentication";
import { Link } from "lucide-react-native";
import { Text, View } from "react-native";

import { apiAppleLink, apiGetMe } from "../../utils/authApi";
import { Divider, Section, type ShadowStyle } from "./SettingsParts";

function useAppleAccount() {
  const [isAppleLinked, setIsAppleLinked] = useState(false);
  const [appleEmail, setAppleEmail] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLinking, setIsLinking] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  useEffect(() => {
    apiGetMe()
      .then((user) => {
        setIsAppleLinked(user.providers?.includes("apple") ?? false);
        setAppleEmail(user.providerEmails?.apple ?? null);
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  const linkApple = async (credential: string) => {
    setIsLinking(true);
    setMessage(null);
    try {
      await apiAppleLink(credential);
      const user = await apiGetMe();
      setIsAppleLinked(user.providers?.includes("apple") ?? false);
      setAppleEmail(user.providerEmails?.apple ?? null);
      setMessage({ type: "success", text: "Appleアカウントを連携しました" });
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
    isAppleLinked,
    appleEmail,
    isLoading,
    isLinking,
    message,
    linkApple,
  };
}

export function AppleLinkSection({ shadow }: { shadow: ShadowStyle }) {
  const apple = useAppleAccount();

  return (
    <Section icon={Link} label="Apple連携" shadow={shadow}>
      {apple.isLoading ? (
        <View className="px-4 py-3">
          <Text className="text-sm text-gray-500">読み込み中...</Text>
        </View>
      ) : (
        <View className="px-4 py-3 gap-2">
          {apple.isAppleLinked ? (
            <View className="flex-row items-center gap-2">
              <Text className="text-sm text-green-700 font-medium">
                Apple連携済み
              </Text>
              {apple.appleEmail && (
                <Text className="text-xs text-gray-500">
                  {apple.appleEmail}
                </Text>
              )}
            </View>
          ) : (
            <Text className="text-xs text-gray-500">
              Appleアカウントを連携すると、Apple
              IDでもこのアカウントにアクセスできます。
            </Text>
          )}
          <AppleAuthentication.AppleAuthenticationButton
            buttonType={
              AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN
            }
            buttonStyle={
              AppleAuthentication.AppleAuthenticationButtonStyle.BLACK
            }
            cornerRadius={8}
            style={{ width: "100%", height: 48 }}
            onPress={async () => {
              try {
                const credential = await AppleAuthentication.signInAsync({
                  requestedScopes: [
                    AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
                    AppleAuthentication.AppleAuthenticationScope.EMAIL,
                  ],
                });
                if (credential.identityToken) {
                  await apple.linkApple(credential.identityToken);
                }
              } catch {
                // ERR_REQUEST_CANCELED など — 何もしない
              }
            }}
          />
        </View>
      )}
      {apple.message && (
        <>
          <Divider />
          <View className="px-4 py-2">
            <Text
              className={`text-xs ${apple.message.type === "success" ? "text-green-600" : "text-red-500"}`}
            >
              {apple.message.text}
            </Text>
          </View>
        </>
      )}
    </Section>
  );
}

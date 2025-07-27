import { ActivityIndicator, View } from "react-native";

import { Redirect, Stack } from "expo-router";

import { OfflineBanner } from "../../src/components/sync";
import { useAuth } from "../../src/hooks/useAuth";

export default function AppLayout() {
  const { user, isInitialized } = useAuth();

  // 初期化中の表示
  if (!isInitialized) {
    return (
      <View className="flex-1 bg-gray-50 items-center justify-center">
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  // 未認証の場合はログイン画面へリダイレクト
  if (!user) {
    return <Redirect href="/(auth)" />;
  }

  return (
    <>
      <OfflineBanner />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
      </Stack>
    </>
  );
}

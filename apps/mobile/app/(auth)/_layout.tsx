import { ActivityIndicator, View } from "react-native";

import { Stack , Redirect } from "expo-router";

import { useAuth } from "../../src/hooks/useAuth";

export default function AuthLayout() {
  const { user, isInitialized } = useAuth();

  // 初期化中の表示
  if (!isInitialized) {
    return (
      <View className="flex-1 bg-gray-50 items-center justify-center">
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  // 認証済みの場合はホーム画面へリダイレクト
  if (user) {
    return <Redirect href="/(app)/home" />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="login" />
      <Stack.Screen name="signup" />
    </Stack>
  );
}

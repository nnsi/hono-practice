import { Stack } from "expo-router";
import { Redirect } from "expo-router";

import { useAuth } from "../../src/hooks/useAuth";
import { ActivityIndicator, View, StyleSheet } from "react-native";

export default function AuthLayout() {
  const { user, isInitialized } = useAuth();

  // 初期化中の表示
  if (!isInitialized) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  // 認証済みの場合はホーム画面へリダイレクト
  if (user) {
    return <Redirect href="/(app)/home" />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="login" />
      <Stack.Screen name="signup" />
    </Stack>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: "#f5f5f5",
    alignItems: "center",
    justifyContent: "center",
  },
});
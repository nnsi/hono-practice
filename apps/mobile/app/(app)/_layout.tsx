import { Stack } from "expo-router";
import { Redirect } from "expo-router";

import { useAuth } from "../../src/hooks/useAuth";
import { ActivityIndicator, View, StyleSheet } from "react-native";

export default function AppLayout() {
  const { user, isInitialized } = useAuth();

  // 初期化中の表示
  if (!isInitialized) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  // 未認証の場合はログイン画面へリダイレクト
  if (!user) {
    return <Redirect href="/(auth)/login" />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="home" />
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
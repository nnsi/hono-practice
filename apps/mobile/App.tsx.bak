import { useState } from "react";

import { ActivityIndicator, StyleSheet, View } from "react-native";

import { StatusBar } from "expo-status-bar";

import { AuthProvider } from "./src/contexts/AuthContext";
import { useAuth } from "./src/hooks/useAuth";
import { TokenProvider } from "./src/providers/TokenProvider";
import { HomeScreen } from "./src/screens/HomeScreen";
import { LoginScreen } from "./src/screens/LoginScreen";
import { SignupScreen } from "./src/screens/SignupScreen";

function AppContent() {
  const { user, isLoading, isInitialized } = useAuth();
  const [isLoginMode, setIsLoginMode] = useState(true);

  console.log(
    "App render - user:",
    user,
    "isLoading:",
    isLoading,
    "isInitialized:",
    isInitialized,
  );

  // 初期化中の表示
  if (!isInitialized) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  if (user) {
    return (
      <>
        <HomeScreen />
        <StatusBar style="auto" />
      </>
    );
  }

  return (
    <>
      {isLoginMode ? (
        <LoginScreen onSwitchToSignup={() => setIsLoginMode(false)} />
      ) : (
        <SignupScreen onSwitchToLogin={() => setIsLoginMode(true)} />
      )}
      <StatusBar style="auto" />
    </>
  );
}

export default function App() {
  return (
    <TokenProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </TokenProvider>
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

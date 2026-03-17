import "../src/polyfills/crypto";

import { createContext, useContext, useEffect } from "react";
import * as Updates from "expo-updates";

import AsyncStorage from "@react-native-async-storage/async-storage";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Slot, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { ActivityIndicator, LogBox, View } from "react-native";

LogBox.ignoreLogs(["SafeAreaView has been deprecated"]);

import { SafeAreaProvider } from "react-native-safe-area-context";

import { DebtFeedbackToast } from "../src/components/common/DebtFeedbackToast";
import { OverlayHost } from "../src/components/common/overlayPortal";
import { ErrorBoundary } from "../src/components/root/ErrorBoundary";
import { useAuth } from "../src/hooks/useAuth";
import { useSyncEngine } from "../src/hooks/useSyncEngine";
import { clearLocalData } from "../src/sync/initialSync";
import { setupGlobalErrorHandler } from "../src/utils/globalErrorHandler";
import "../global.css";

const queryClient = new QueryClient();

type AuthContextType = {
  isLoggedIn: boolean;
  isLoading: boolean;
  syncReady: boolean;
  userId: string | null;
  login: (loginId: string, password: string) => Promise<void>;
  googleLogin: (credential: string) => Promise<void>;
  register: (name: string, loginId: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextType>({
  isLoggedIn: false,
  isLoading: true,
  syncReady: false,
  userId: null,
  login: async () => {},
  googleLogin: async () => {},
  register: async () => {},
  logout: async () => {},
});

export function useAuthContext() {
  return useContext(AuthContext);
}

export default function RootLayout() {
  const auth = useAuth();
  const router = useRouter();
  const segments = useSegments();

  useSyncEngine(auth.syncReady);

  useEffect(() => {
    setupGlobalErrorHandler();

    // Debug: expo-updates state
    console.log("[updates] channel:", Updates.channel);
    console.log("[updates] runtimeVersion:", Updates.runtimeVersion);
    console.log("[updates] isEmbeddedLaunch:", Updates.isEmbeddedLaunch);
    console.log("[updates] updateId:", Updates.updateId);
    console.log("[updates] isEnabled:", Updates.isEnabled);

    if (!__DEV__) {
      Updates.checkForUpdateAsync()
        .then((result) => {
          console.log("[updates] checkForUpdate:", JSON.stringify(result));
          if (result.isAvailable) {
            return Updates.fetchUpdateAsync().then((fetchResult) => {
              console.log("[updates] fetched:", JSON.stringify(fetchResult));
            });
          }
        })
        .catch((err) => {
          console.error("[updates] check failed:", err);
        });
    }
  }, []);

  useEffect(() => {
    if (auth.isLoading) return;

    const inAuthGroup = segments[0] === "(auth)";

    if (!auth.isLoggedIn && !inAuthGroup) {
      router.replace("/(auth)/login");
    } else if (auth.isLoggedIn && inAuthGroup) {
      AsyncStorage.getItem("actiko-v2-settings").then((raw) => {
        let showGoal = false;
        if (raw) {
          try {
            const settings = JSON.parse(raw);
            showGoal = settings.showGoalOnStartup === true;
          } catch {
            // ignore parse error
          }
        }
        router.replace(showGoal ? "/(tabs)/goals" : "/(tabs)");
      });
    }
  }, [auth.isLoggedIn, auth.isLoading, segments]);

  if (auth.isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  return (
    <ErrorBoundary onRecover={clearLocalData}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <AuthContext.Provider value={auth}>
            <StatusBar style="auto" />
            <View className="flex-1 bg-stone-100">
              <Slot />
              <DebtFeedbackToast />
              <OverlayHost />
            </View>
          </AuthContext.Provider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}

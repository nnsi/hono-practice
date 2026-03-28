import "../src/polyfills/crypto";

import { createContext, useContext, useEffect, useRef } from "react";

import { initI18n, useTranslation } from "@packages/i18n";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import dayjs from "dayjs";
import "dayjs/locale/ja";
import "dayjs/locale/en";

import { getLocales } from "expo-localization";
import { Slot, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { ActivityIndicator, LogBox, Text, View } from "react-native";

LogBox.ignoreLogs(["SafeAreaView has been deprecated"]);

import { SafeAreaProvider } from "react-native-safe-area-context";

import { DebtFeedbackToast } from "../src/components/common/DebtFeedbackToast";
import { OverlayHost } from "../src/components/common/overlayPortal";
import { UpdateToast } from "../src/components/common/UpdateToast";
import { ErrorBoundary } from "../src/components/root/ErrorBoundary";
import { useAuth } from "../src/hooks/useAuth";
import { useOtaUpdate } from "../src/hooks/useOtaUpdate";
import { useSyncEngine } from "../src/hooks/useSyncEngine";
import { initRevenueCat } from "../src/lib/revenueCat";
import { clearLocalData } from "../src/sync/initialSync";
import { setupGlobalErrorHandler } from "../src/utils/globalErrorHandler";
import "../global.css";

const deviceLang = getLocales()[0]?.languageCode ?? "ja";
const resolvedLang = deviceLang === "ja" ? "ja" : "en";
dayjs.locale(resolvedLang);
initI18n({
  lng: resolvedLang,
  onLanguageChanged: (lng) => dayjs.locale(lng === "ja" ? "ja" : "en"),
});

const queryClient = new QueryClient();

type AuthContextType = {
  isLoggedIn: boolean;
  isLoading: boolean;
  syncReady: boolean;
  userId: string | null;
  login: (loginId: string, password: string) => Promise<void>;
  googleLogin: (credential: string) => Promise<void>;
  appleLogin: (credential: string) => Promise<void>;
  completeLogin: (userId: string) => Promise<void>;
  register: (loginId: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextType>({
  isLoggedIn: false,
  isLoading: true,
  syncReady: false,
  userId: null,
  login: async () => {},
  googleLogin: async () => {},
  appleLogin: async () => {},
  completeLogin: async () => {},
  register: async () => {},
  logout: async () => {},
});

export function useAuthContext() {
  return useContext(AuthContext);
}

export default function RootLayout() {
  const { t } = useTranslation("common");
  const auth = useAuth();
  const router = useRouter();
  const segments = useSegments();
  const { isUpdating, hasPendingUpdate, triggerReload, dismissPendingUpdate } =
    useOtaUpdate();

  useSyncEngine(auth.syncReady);

  useEffect(() => {
    setupGlobalErrorHandler();
  }, []);

  useEffect(() => {
    if (auth.isLoggedIn && auth.userId) {
      initRevenueCat(auth.userId).catch(() => {
        // RevenueCat init failure is non-fatal
      });
    }
  }, [auth.isLoggedIn, auth.userId]);

  const startupRedirectDone = useRef(false);

  useEffect(() => {
    if (auth.isLoading) return;

    const inAuthGroup =
      segments[0] === "(auth)" || segments[0] === "oauthredirect";

    if (!auth.isLoggedIn && !inAuthGroup) {
      router.replace("/(auth)/login");
      startupRedirectDone.current = false;
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
        startupRedirectDone.current = true;
      });
    } else if (
      auth.isLoggedIn &&
      !inAuthGroup &&
      !startupRedirectDone.current
    ) {
      startupRedirectDone.current = true;
      AsyncStorage.getItem("actiko-v2-settings").then((raw) => {
        if (!raw) return;
        try {
          const settings = JSON.parse(raw);
          if (settings.showGoalOnStartup === true) {
            router.replace("/(tabs)/goals");
          }
        } catch {
          // ignore parse error
        }
      });
    }
  }, [auth.isLoggedIn, auth.isLoading, segments]);

  if (isUpdating) {
    return (
      <View className="flex-1 items-center justify-center bg-white gap-4">
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text className="text-base text-stone-500">{t("common.updating")}</Text>
      </View>
    );
  }

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
              <UpdateToast
                visible={hasPendingUpdate}
                onReload={triggerReload}
                onDismiss={dismissPendingUpdate}
              />
              <OverlayHost />
            </View>
          </AuthContext.Provider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}

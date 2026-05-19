import "../src/polyfills/crypto";
import "react-native-gesture-handler";

import { useEffect, useRef } from "react";

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

import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { DebtFeedbackToast } from "../src/components/common/DebtFeedbackToast";
import { OverlayHost } from "../src/components/common/overlayPortal";
import { UpdateToast } from "../src/components/common/UpdateToast";
import { ErrorBoundary } from "../src/components/root/ErrorBoundary";
import { TutorialWizard } from "../src/components/tutorial/TutorialWizard";
import { ThemeProvider } from "../src/contexts/ThemeContext";
import { useAuth } from "../src/hooks/useAuth";
import { useOtaUpdate } from "../src/hooks/useOtaUpdate";
import { useSyncEngine } from "../src/hooks/useSyncEngine";
import { clearThemePreference } from "../src/hooks/useTheme";
import { useTutorial } from "../src/hooks/useTutorial";
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

import { AuthContext } from "../src/contexts/AuthContext";

export default function RootLayout() {
  const { t } = useTranslation("common");
  const auth = useAuth();
  const router = useRouter();
  const segments = useSegments();
  const { isUpdating, hasPendingUpdate, triggerReload, dismissPendingUpdate } =
    useOtaUpdate();

  useSyncEngine(auth.syncReady);
  const tutorial = useTutorial();

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

  return (
    <ErrorBoundary
      onRecover={async () => {
        await clearThemePreference();
        await clearLocalData();
      }}
    >
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <ThemeProvider>
            {isUpdating ? (
              <View className="flex-1 items-center justify-center bg-white dark:bg-gray-900 gap-4">
                <ActivityIndicator size="large" color="#3b82f6" />
                <Text className="text-base text-stone-500 dark:text-stone-400">
                  {t("common.updating")}
                </Text>
              </View>
            ) : auth.isLoading ? (
              <View className="flex-1 items-center justify-center bg-white dark:bg-gray-900">
                <ActivityIndicator size="large" color="#3b82f6" />
              </View>
            ) : (
              <QueryClientProvider client={queryClient}>
                <AuthContext.Provider value={auth}>
                  <StatusBar style="auto" />
                  <View className="flex-1 bg-stone-100 dark:bg-gray-900">
                    <Slot />
                    <DebtFeedbackToast />
                    <UpdateToast
                      visible={hasPendingUpdate}
                      onReload={triggerReload}
                      onDismiss={dismissPendingUpdate}
                    />
                    <OverlayHost />
                    {tutorial.isOpen && (
                      <TutorialWizard
                        complete={tutorial.complete}
                        skip={tutorial.skip}
                      />
                    )}
                  </View>
                </AuthContext.Provider>
              </QueryClientProvider>
            )}
          </ThemeProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}

import { useState } from "react";

import { useTranslation } from "@packages/i18n";
import { useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { Info, Settings, User } from "lucide-react-native";
import {
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuthContext } from "../../contexts/AuthContext";
import { useThemeContext } from "../../contexts/ThemeContext";
import { mobileTestIds } from "../../testing/testIds";
import { mobileTestIdsExt } from "../../testing/testIdsExt";
import { LegalModal } from "../common/LegalModal";
import { AccountAndDangerSection } from "./AccountAndDangerSection";
import { DataManagementSection } from "./AccountSection";
import { AppleLinkSection } from "./AppleLinkSection";
import { DEV_TOOLS_ENABLED, DevToolsSection } from "./DevToolsSection";
import { GoogleLinkSection } from "./GoogleLinkSection";
import { Divider, Section, SettingSwitch } from "./SettingsParts";
import { SubscriptionSection } from "./SubscriptionSection";
import { TabCustomizationSection } from "./TabCustomizationSection";
import { ThemeSelector } from "./ThemeSelector";
import { useAppSettings } from "./useAppSettings";

WebBrowser.maybeCompleteAuthSession();

// CustomTabBar の高さは React Navigation の useBottomTabBarHeight が
// CustomTabBar 経由だと context を更新しないため使えない（呼ぶと throw する）。
// CustomTabBar の構造（paddingTop:8 + 子高さ~50 + paddingBottom:10 + insets.bottom）
// に合わせた固定値を bottom inset と足し込む。
const CUSTOM_TAB_BAR_CONTENT_HEIGHT = 68;

export function SettingsPage() {
  const { t } = useTranslation("settings");
  const { userId, logout } = useAuthContext();
  const { settings, updateSetting } = useAppSettings();
  const { colors } = useThemeContext();
  const insets = useSafeAreaInsets();
  const tabBarHeight = CUSTOM_TAB_BAR_CONTENT_HEIGHT + insets.bottom;
  const router = useRouter();
  const shadow = {
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  };
  const [legalModal, setLegalModal] = useState<"privacy" | "terms" | null>(
    null,
  );
  const [isTabCustomizationDragging, setIsTabCustomizationDragging] =
    useState(false);

  return (
    <ScrollView
      className="flex-1"
      scrollEnabled={!isTabCustomizationDragging}
      testID={mobileTestIds.settings.screen}
      contentContainerStyle={{ paddingBottom: tabBarHeight + 24 }}
    >
      {/* User info */}
      <View
        className="mx-4 mt-4 p-4 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700"
        style={shadow}
      >
        <View className="flex-row items-center">
          <View className="w-10 h-10 bg-amber-100 dark:bg-amber-900/30 rounded-full items-center justify-center">
            <User size={20} color="#f59e0b" />
          </View>
          <View className="ml-3 flex-1">
            <Text className="text-sm text-gray-500 dark:text-gray-400">
              {t("userId")}
            </Text>
            <Text
              className="text-xs text-gray-400 dark:text-gray-500 mt-0.5"
              numberOfLines={1}
            >
              {userId || t("notLoggedIn")}
            </Text>
          </View>
        </View>
      </View>

      <SubscriptionSection shadow={shadow} />

      <GoogleLinkSection shadow={shadow} />
      {Platform.OS === "ios" && <AppleLinkSection shadow={shadow} />}

      {/* App settings */}
      <Section icon={Settings} label={t("appSettings")} shadow={shadow}>
        <SettingSwitch
          label={t("showGoalOnStartup")}
          desc={t("showGoalOnStartupDesc")}
          value={settings.showGoalOnStartup}
          onChange={(v) => updateSetting("showGoalOnStartup", v)}
          testID={mobileTestIdsExt.settingsToggle.showGoalOnStartup}
        />
        <Divider />
        <SettingSwitch
          label={t("showInactiveDates")}
          desc={t("showInactiveDatesDesc")}
          value={settings.showInactiveDates}
          onChange={(v) => updateSetting("showInactiveDates", v)}
          testID={mobileTestIdsExt.settingsToggle.showInactiveDates}
        />
        <Divider />
        <SettingSwitch
          label={t("praiseMode")}
          desc={t("praiseModeDesc")}
          value={settings.praiseMode}
          onChange={(v) => updateSetting("praiseMode", v)}
          testID={mobileTestIdsExt.settingsToggle.praiseMode}
        />
        <Divider />
        <ThemeSelector />
      </Section>

      <TabCustomizationSection
        shadow={shadow}
        onDragStateChange={setIsTabCustomizationDragging}
      />

      <DataManagementSection shadow={shadow} />
      <AccountAndDangerSection shadow={shadow} logout={logout} />

      {DEV_TOOLS_ENABLED && <DevToolsSection shadow={shadow} />}

      {/* App version */}
      <View className="items-center mt-8 mb-8 gap-2">
        <View className="flex-row items-center">
          <Info size={14} color="#9ca3af" />
          <Text className="ml-1 text-xs text-gray-400 dark:text-gray-500">
            Actiko v1.0.0
          </Text>
        </View>
        <View className="flex-row gap-3">
          <TouchableOpacity
            onPress={() => setLegalModal("privacy")}
            accessibilityRole="link"
            accessibilityLabel={t("privacyPolicy")}
          >
            <Text className="text-xs text-blue-500 dark:text-blue-400 underline">
              {t("privacyPolicy")}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setLegalModal("terms")}
            accessibilityRole="link"
            accessibilityLabel={t("termsOfService")}
          >
            <Text className="text-xs text-blue-500 dark:text-blue-400 underline">
              {t("termsOfService")}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.push("/(tabs)/contact")}
            accessibilityRole="link"
            accessibilityLabel={t("contact")}
          >
            <Text className="text-xs text-blue-500 dark:text-blue-400 underline">
              {t("contact")}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {legalModal && (
        <LegalModal
          visible={!!legalModal}
          type={legalModal}
          onClose={() => setLegalModal(null)}
        />
      )}
    </ScrollView>
  );
}

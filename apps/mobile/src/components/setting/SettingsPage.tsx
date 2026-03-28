import { useState } from "react";

import { useTranslation } from "@packages/i18n";
import * as WebBrowser from "expo-web-browser";
import { Info, Settings, User } from "lucide-react-native";
import {
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { useAuthContext } from "../../../app/_layout";
import { useThemeContext } from "../../contexts/ThemeContext";
import { LegalModal } from "../common/LegalModal";
import {
  AccountAndDangerSection,
  DataManagementSection,
} from "./AccountSection";
import { AppleLinkSection } from "./AppleLinkSection";
import { GoogleLinkSection } from "./GoogleLinkSection";
import { Divider, Section, SettingSwitch } from "./SettingsParts";
import { SubscriptionSection } from "./SubscriptionSection";
import { ThemeSelector } from "./ThemeSelector";
import { useAppSettings } from "./useAppSettings";

WebBrowser.maybeCompleteAuthSession();

export function SettingsPage() {
  const { t } = useTranslation("settings");
  const { userId, logout } = useAuthContext();
  const { settings, updateSetting } = useAppSettings();
  const { colors } = useThemeContext();
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

  return (
    <ScrollView className="flex-1">
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
        />
        <Divider />
        <SettingSwitch
          label={t("showInactiveDates")}
          desc={t("showInactiveDatesDesc")}
          value={settings.showInactiveDates}
          onChange={(v) => updateSetting("showInactiveDates", v)}
        />
        <Divider />
        <SettingSwitch
          label={t("praiseMode")}
          desc={t("praiseModeDesc")}
          value={settings.praiseMode}
          onChange={(v) => updateSetting("praiseMode", v)}
        />
        <Divider />
        <ThemeSelector />
      </Section>

      <DataManagementSection shadow={shadow} />
      <AccountAndDangerSection shadow={shadow} logout={logout} />

      {/* App version */}
      <View className="items-center mt-8 mb-8 gap-2">
        <View className="flex-row items-center">
          <Info size={14} color="#9ca3af" />
          <Text className="ml-1 text-xs text-gray-400 dark:text-gray-500">
            Actiko v1.0.0
          </Text>
        </View>
        <View className="flex-row gap-3">
          <TouchableOpacity onPress={() => setLegalModal("privacy")}>
            <Text className="text-xs text-blue-500 dark:text-blue-400 underline">
              {t("privacyPolicy")}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setLegalModal("terms")}>
            <Text className="text-xs text-blue-500 dark:text-blue-400 underline">
              {t("termsOfService")}
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

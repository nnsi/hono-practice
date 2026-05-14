import { useState } from "react";

import { useTranslation } from "@packages/i18n";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AlertTriangle, LogOut, User } from "lucide-react-native";
import { Text, TouchableOpacity } from "react-native";

import { apiClient } from "../../api/apiClient";
import { clearToken } from "../../api/tokenHolder";
import { clearStoredRefreshToken as clearRefreshToken } from "../../auth/mobileAuthTransport";
import { clearLocalData } from "../../sync/initialSync";
import { mobileTestIds } from "../../testing/testIds";
import { InlineConfirm, Section, type ShadowStyle } from "./SettingsParts";
import { SETTINGS_KEY } from "./useAppSettings";

export function AccountAndDangerSection({
  shadow,
  logout,
}: {
  shadow: ShadowStyle;
  logout: () => void;
}) {
  const { t } = useTranslation("settings");
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteAccount = async () => {
    setDeleteError("");
    setIsDeleting(true);
    try {
      const res = await apiClient.user.me.$delete();
      if (!res.ok) throw new Error(`Delete failed: ${res.status}`);
      await clearLocalData();
      clearToken();
      await clearRefreshToken();
      await AsyncStorage.removeItem(SETTINGS_KEY);
      setShowDeleteConfirm(false);
      await logout();
    } catch {
      setDeleteError(t("deleteAccountError"));
      setIsDeleting(false);
    }
  };

  return (
    <>
      <Section icon={User} label={t("account")} shadow={shadow}>
        {!showLogoutConfirm ? (
          <TouchableOpacity
            className="flex-row items-center px-4 py-3"
            onPress={() => setShowLogoutConfirm(true)}
            accessibilityRole="button"
            accessibilityLabel={t("logout")}
            testID={mobileTestIds.settings.logoutButton}
          >
            <LogOut size={18} color="#ef4444" />
            <Text className="ml-3 text-base text-red-500 dark:text-red-400">
              {t("logout")}
            </Text>
          </TouchableOpacity>
        ) : (
          <InlineConfirm
            message={t("logoutConfirm")}
            onConfirm={() => {
              logout();
              setShowLogoutConfirm(false);
            }}
            onCancel={() => setShowLogoutConfirm(false)}
            confirmLabel={t("logout")}
          />
        )}
      </Section>

      <Section
        icon={AlertTriangle}
        label={t("dangerousOperations")}
        shadow={shadow}
      >
        {!showDeleteConfirm ? (
          <TouchableOpacity
            className="flex-row items-center px-4 py-3"
            onPress={() => setShowDeleteConfirm(true)}
            accessibilityRole="button"
            accessibilityLabel={t("deleteAccount")}
          >
            <AlertTriangle size={18} color="#ef4444" />
            <Text className="ml-3 text-base text-red-500 dark:text-red-400">
              {t("deleteAccount")}
            </Text>
          </TouchableOpacity>
        ) : (
          <InlineConfirm
            message={t("deleteAccountConfirm")}
            confirmLabel={t("deleteAccountButton")}
            onConfirm={handleDeleteAccount}
            onCancel={() => {
              setShowDeleteConfirm(false);
              setDeleteError("");
            }}
            error={deleteError}
            disabled={isDeleting}
          />
        )}
      </Section>
    </>
  );
}

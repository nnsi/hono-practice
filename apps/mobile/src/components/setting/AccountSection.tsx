import { useState } from "react";

import { useTranslation } from "@packages/i18n";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  AlertTriangle,
  Database,
  Download,
  LogOut,
  Trash2,
  Upload,
  User,
} from "lucide-react-native";
import { Text, TouchableOpacity, View } from "react-native";

import { clearLocalData } from "../../sync/initialSync";
import {
  clearRefreshToken,
  clearToken,
  customFetch,
  getApiUrl,
} from "../../utils/apiClient";
import { CSVExportModal } from "../csv/CSVExportModal";
import { CSVImportModal } from "../csv/CSVImportModal";
import {
  Divider,
  InlineConfirm,
  Section,
  type ShadowStyle,
} from "./SettingsParts";
import { SETTINGS_KEY } from "./useAppSettings";

const API_URL = getApiUrl();

export function DataManagementSection({ shadow }: { shadow: ShadowStyle }) {
  const { t } = useTranslation("settings");
  const [showImport, setShowImport] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const handleClearData = async () => {
    await clearLocalData();
    setShowClearConfirm(false);
  };

  return (
    <>
      <Section icon={Database} label={t("dataManagement")} shadow={shadow}>
        <TouchableOpacity
          className="flex-row items-center px-4 py-3"
          onPress={() => setShowImport(true)}
        >
          <Upload size={18} color="#3b82f6" />
          <Text className="ml-3 text-base text-blue-600 dark:text-blue-400">{t("importCSV")}</Text>
        </TouchableOpacity>
        <Divider />
        <TouchableOpacity
          className="flex-row items-center px-4 py-3"
          onPress={() => setShowExport(true)}
        >
          <Download size={18} color="#3b82f6" />
          <Text className="ml-3 text-base text-blue-600 dark:text-blue-400">{t("exportCSV")}</Text>
        </TouchableOpacity>
        <Divider />
        <View className="px-4 py-3">
          <Text className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
            {t("localStorageNote")}
          </Text>
        </View>
        <Divider />
        {!showClearConfirm ? (
          <TouchableOpacity
            className="flex-row items-center px-4 py-3"
            onPress={() => setShowClearConfirm(true)}
          >
            <Trash2 size={18} color="#ef4444" />
            <Text className="ml-3 text-base text-red-500 dark:text-red-400">
              {t("deleteLocalData")}
            </Text>
          </TouchableOpacity>
        ) : (
          <InlineConfirm
            message={t("deleteLocalDataConfirm")}
            confirmLabel={t("deleteLocalDataButton")}
            onConfirm={handleClearData}
            onCancel={() => setShowClearConfirm(false)}
          />
        )}
      </Section>

      <CSVImportModal
        visible={showImport}
        onClose={() => setShowImport(false)}
      />
      <CSVExportModal
        visible={showExport}
        onClose={() => setShowExport(false)}
      />
    </>
  );
}

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
      const res = await customFetch(`${API_URL}/user/me`, { method: "DELETE" });
      if (!res.ok) throw new Error(`Delete failed: ${res.status}`);
      await clearLocalData();
      clearToken();
      await clearRefreshToken();
      await AsyncStorage.removeItem(SETTINGS_KEY);
      setShowDeleteConfirm(false);
      await logout();
    } catch {
      setDeleteError(
        "アカウント削除に失敗しました。ネットワーク接続を確認してください。",
      );
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
          >
            <LogOut size={18} color="#ef4444" />
            <Text className="ml-3 text-base text-red-500 dark:text-red-400">{t("logout")}</Text>
          </TouchableOpacity>
        ) : (
          <InlineConfirm
            message="ログアウトしますか？"
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

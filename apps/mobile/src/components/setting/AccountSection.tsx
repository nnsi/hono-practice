import { useState } from "react";

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
  const [showImport, setShowImport] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const handleClearData = async () => {
    await clearLocalData();
    setShowClearConfirm(false);
  };

  return (
    <>
      <Section icon={Database} label="データ管理" shadow={shadow}>
        <TouchableOpacity
          className="flex-row items-center px-4 py-3"
          onPress={() => setShowImport(true)}
        >
          <Upload size={18} color="#3b82f6" />
          <Text className="ml-3 text-base text-blue-600">
            CSVから活動記録をインポート
          </Text>
        </TouchableOpacity>
        <Divider />
        <TouchableOpacity
          className="flex-row items-center px-4 py-3"
          onPress={() => setShowExport(true)}
        >
          <Download size={18} color="#3b82f6" />
          <Text className="ml-3 text-base text-blue-600">
            活動記録をCSVにエクスポート
          </Text>
        </TouchableOpacity>
        <Divider />
        <View className="px-4 py-3">
          <Text className="text-xs text-gray-500 leading-relaxed">
            アクティビティや記録データはローカルストレージに保存されています。サーバーとの同期によりデータは復元可能です。
          </Text>
        </View>
        <Divider />
        {!showClearConfirm ? (
          <TouchableOpacity
            className="flex-row items-center px-4 py-3"
            onPress={() => setShowClearConfirm(true)}
          >
            <Trash2 size={18} color="#ef4444" />
            <Text className="ml-3 text-base text-red-500">
              ローカルデータを削除
            </Text>
          </TouchableOpacity>
        ) : (
          <InlineConfirm
            message="ローカルに保存されたデータをすべて削除します。次回アクセス時にサーバーから再同期されます。"
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
      <Section icon={User} label="アカウント" shadow={shadow}>
        {!showLogoutConfirm ? (
          <TouchableOpacity
            className="flex-row items-center px-4 py-3"
            onPress={() => setShowLogoutConfirm(true)}
          >
            <LogOut size={18} color="#ef4444" />
            <Text className="ml-3 text-base text-red-500">ログアウト</Text>
          </TouchableOpacity>
        ) : (
          <InlineConfirm
            message="ログアウトしますか？"
            onConfirm={() => {
              logout();
              setShowLogoutConfirm(false);
            }}
            onCancel={() => setShowLogoutConfirm(false)}
            confirmLabel="ログアウト"
          />
        )}
      </Section>

      <Section icon={AlertTriangle} label="危険な操作" shadow={shadow}>
        {!showDeleteConfirm ? (
          <TouchableOpacity
            className="flex-row items-center px-4 py-3"
            onPress={() => setShowDeleteConfirm(true)}
          >
            <AlertTriangle size={18} color="#ef4444" />
            <Text className="ml-3 text-base text-red-500">
              アカウントを削除
            </Text>
          </TouchableOpacity>
        ) : (
          <InlineConfirm
            message="アカウントを削除すると全データが失われます。この操作は取り消せません。"
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

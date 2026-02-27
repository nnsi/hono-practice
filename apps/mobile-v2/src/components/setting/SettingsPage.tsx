import { useState, useEffect } from "react";
import { View, Text, ScrollView, TouchableOpacity, Switch, Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Upload, Download, LogOut, User, Info, Settings, Database, Trash2, AlertTriangle } from "lucide-react-native";
import { useAuthContext } from "../../../app/_layout";
import { clearLocalDataForUserSwitch } from "../../sync/initialSync";
import { customFetch, clearToken, clearRefreshToken, getApiUrl } from "../../utils/apiClient";
import { CSVImportModal } from "../csv/CSVImportModal";
import { CSVExportModal } from "../csv/CSVExportModal";

const SETTINGS_KEY = "actiko-v2-settings";
const API_URL = getApiUrl();

type AppSettings = { showGoalOnStartup: boolean; hideGoalGraph: boolean; showInactiveDates: boolean };
const defaultSettings: AppSettings = { showGoalOnStartup: false, hideGoalGraph: false, showInactiveDates: false };

function useAppSettings() {
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  useEffect(() => {
    AsyncStorage.getItem(SETTINGS_KEY).then((raw) => {
      if (!raw) return;
      try { setSettings({ ...defaultSettings, ...JSON.parse(raw) }); } catch { AsyncStorage.removeItem(SETTINGS_KEY); }
    });
  }, []);
  const updateSetting = (key: keyof AppSettings, value: boolean) => {
    setSettings((prev) => { const next = { ...prev, [key]: value }; AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(next)); return next; });
  };
  return { settings, updateSetting };
}

export function SettingsPage() {
  const { userId, logout } = useAuthContext();
  const { settings, updateSetting } = useAppSettings();
  const [showImport, setShowImport] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleClearData = async () => { await clearLocalDataForUserSwitch(); setShowClearConfirm(false); };

  const handleDeleteAccount = async () => {
    try { await customFetch(`${API_URL}/user/me`, { method: "DELETE" }); } catch { /* offline */ }
    await clearLocalDataForUserSwitch();
    clearToken();
    await clearRefreshToken();
    await AsyncStorage.removeItem(SETTINGS_KEY);
    setShowDeleteConfirm(false);
    logout();
  };

  const shadow = { shadowColor: "#1c1917", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 3, elevation: 2 };

  return (
    <ScrollView className="flex-1 bg-gray-50">
      {/* User info */}
      <View className="mx-4 mt-4 p-4 bg-white rounded-2xl border border-gray-200" style={shadow}>
        <View className="flex-row items-center">
          <View className="w-10 h-10 bg-amber-100 rounded-full items-center justify-center">
            <User size={20} color="#f59e0b" />
          </View>
          <View className="ml-3 flex-1">
            <Text className="text-sm text-gray-500">ユーザーID</Text>
            <Text className="text-xs text-gray-400 mt-0.5" numberOfLines={1}>{userId || "未ログイン"}</Text>
          </View>
        </View>
      </View>

      {/* App settings */}
      <Section icon={Settings} label="アプリ設定" shadow={shadow}>
        <SettingSwitch label="起動時に目標画面を表示" desc="アプリ起動時の初期画面を目標画面にします" value={settings.showGoalOnStartup} onChange={(v) => updateSetting("showGoalOnStartup", v)} />
        <Divider />
        <SettingSwitch label="目標グラフを非表示" desc="負債時間と未実施日のみを表示します" value={settings.hideGoalGraph} onChange={(v) => updateSetting("hideGoalGraph", v)} />
        <Divider />
        <SettingSwitch label="やらなかった日付をデフォルトで表示" desc="目標詳細で活動がなかった日付を表示します" value={settings.showInactiveDates} onChange={(v) => updateSetting("showInactiveDates", v)} />
      </Section>

      {/* Data management */}
      <Section icon={Database} label="データ管理" shadow={shadow}>
        <TouchableOpacity className="flex-row items-center px-4 py-3" onPress={() => setShowImport(true)}>
          <Upload size={18} color="#3b82f6" />
          <Text className="ml-3 text-base text-blue-600">CSVから活動記録をインポート</Text>
        </TouchableOpacity>
        <Divider />
        <TouchableOpacity className="flex-row items-center px-4 py-3" onPress={() => setShowExport(true)}>
          <Download size={18} color="#3b82f6" />
          <Text className="ml-3 text-base text-blue-600">活動記録をCSVにエクスポート</Text>
        </TouchableOpacity>
        <Divider />
        <View className="px-4 py-3">
          <Text className="text-xs text-gray-500 leading-relaxed">
            アクティビティや記録データはローカルストレージに保存されています。サーバーとの同期によりデータは復元可能です。
          </Text>
        </View>
        <Divider />
        {!showClearConfirm ? (
          <TouchableOpacity className="flex-row items-center px-4 py-3" onPress={() => setShowClearConfirm(true)}>
            <Trash2 size={18} color="#ef4444" />
            <Text className="ml-3 text-base text-red-500">ローカルデータを削除</Text>
          </TouchableOpacity>
        ) : (
          <InlineConfirm message="ローカルに保存されたデータをすべて削除します。次回アクセス時にサーバーから再同期されます。" onConfirm={handleClearData} onCancel={() => setShowClearConfirm(false)} />
        )}
      </Section>

      {/* Account */}
      <Section icon={User} label="アカウント" shadow={shadow}>
        {!showDeleteConfirm ? (
          <TouchableOpacity className="flex-row items-center px-4 py-3" onPress={() => setShowDeleteConfirm(true)}>
            <AlertTriangle size={18} color="#ef4444" />
            <Text className="ml-3 text-base text-red-500">アカウントを削除</Text>
          </TouchableOpacity>
        ) : (
          <InlineConfirm message="アカウントを削除すると全データが失われます。この操作は取り消せません。" onConfirm={handleDeleteAccount} onCancel={() => setShowDeleteConfirm(false)} />
        )}
        <Divider />
        {!showLogoutConfirm ? (
          <TouchableOpacity className="flex-row items-center px-4 py-3" onPress={() => setShowLogoutConfirm(true)}>
            <LogOut size={18} color="#ef4444" />
            <Text className="ml-3 text-base text-red-500">ログアウト</Text>
          </TouchableOpacity>
        ) : (
          <InlineConfirm message="ログアウトしますか？" onConfirm={() => { logout(); setShowLogoutConfirm(false); }} onCancel={() => setShowLogoutConfirm(false)} confirmLabel="ログアウト" />
        )}
      </Section>

      {/* App version */}
      <View className="items-center mt-8 mb-8">
        <View className="flex-row items-center">
          <Info size={14} color="#9ca3af" />
          <Text className="ml-1 text-xs text-gray-400">Actiko v2.0</Text>
        </View>
      </View>

      <CSVImportModal visible={showImport} onClose={() => setShowImport(false)} />
      <CSVExportModal visible={showExport} onClose={() => setShowExport(false)} />
    </ScrollView>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function Section({ icon: Icon, label, shadow, children }: { icon: any; label: string; shadow: object; children: React.ReactNode }) {
  return (
    <View className="mx-4 mt-4">
      <View className="flex-row items-center mb-2 ml-1">
        <Icon size={14} color="#9ca3af" />
        <Text className="ml-1.5 text-xs text-gray-400 uppercase tracking-wide">{label}</Text>
      </View>
      <View className="bg-white rounded-2xl border border-gray-200 overflow-hidden" style={shadow}>{children}</View>
    </View>
  );
}

function Divider() { return <View className="border-t border-gray-100 mx-4" />; }

function SettingSwitch({ label, desc, value, onChange }: { label: string; desc: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <View className="flex-row items-center px-4 py-3">
      <View className="flex-1 mr-3">
        <Text className="text-sm font-medium text-gray-900">{label}</Text>
        <Text className="text-xs text-gray-500 mt-0.5">{desc}</Text>
      </View>
      <Switch value={value} onValueChange={onChange} trackColor={{ false: "#d1d5db", true: "#3b82f6" }} thumbColor={Platform.OS === "android" ? "#fff" : undefined} />
    </View>
  );
}

function InlineConfirm({ message, onConfirm, onCancel, confirmLabel = "削除する" }: { message: string; onConfirm: () => void; onCancel: () => void; confirmLabel?: string }) {
  return (
    <View className="mx-3 my-2 bg-red-50 border border-red-200 rounded-lg p-4">
      <Text className="text-sm text-red-700 font-medium mb-3">{message}</Text>
      <View className="flex-row gap-2">
        <TouchableOpacity className="px-4 py-2 bg-red-600 rounded-lg" onPress={onConfirm}>
          <Text className="text-sm text-white font-medium">{confirmLabel}</Text>
        </TouchableOpacity>
        <TouchableOpacity className="px-4 py-2 border border-gray-300 rounded-lg" onPress={onCancel}>
          <Text className="text-sm text-gray-700">キャンセル</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

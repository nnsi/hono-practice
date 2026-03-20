import { useEffect, useState } from "react";

import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";
import {
  AlertTriangle,
  Database,
  Download,
  Info,
  Link,
  LogOut,
  Settings,
  Trash2,
  Upload,
  User,
} from "lucide-react-native";
import {
  Platform,
  ScrollView,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { useAuthContext } from "../../../app/_layout";
import { setOAuthPending } from "../../utils/oauthPending";
import { clearLocalData } from "../../sync/initialSync";
import {
  apiGetMe,
  apiGoogleLink,
  clearRefreshToken,
  clearToken,
  customFetch,
  getApiUrl,
} from "../../utils/apiClient";
import { LegalModal } from "../common/LegalModal";
import { CSVExportModal } from "../csv/CSVExportModal";
import { CSVImportModal } from "../csv/CSVImportModal";

const SETTINGS_KEY = "actiko-v2-settings";
const API_URL = getApiUrl();

type AppSettings = {
  showGoalOnStartup: boolean;
  showInactiveDates: boolean;
  praiseMode: boolean;
};
const defaultSettings: AppSettings = {
  showGoalOnStartup: false,
  showInactiveDates: false,
  praiseMode: false,
};

WebBrowser.maybeCompleteAuthSession();

function useGoogleAccount() {
  const [isGoogleLinked, setIsGoogleLinked] = useState(false);
  const [googleEmail, setGoogleEmail] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLinking, setIsLinking] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const [googleRequest, googleResponse, googlePromptAsync] =
    Google.useAuthRequest(
      {
        webClientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID ?? "",
        androidClientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID ?? "",
        iosClientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_IOS ?? "",
      },
      Platform.OS === "android"
        ? {
            native: `${process.env.EXPO_PUBLIC_API_URL}/auth/google/callback`,
          }
        : undefined,
    );

  useEffect(() => {
    if (Platform.OS === "android" && googleRequest?.codeVerifier) {
      setOAuthPending({
        codeVerifier: googleRequest.codeVerifier,
        redirectUri: `${process.env.EXPO_PUBLIC_API_URL}/auth/google/callback`,
        clientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID ?? "",
      });
    }
  }, [googleRequest]);

  useEffect(() => {
    fetchUserInfo();
  }, []);

  useEffect(() => {
    if (googleResponse?.type === "success") {
      const idToken = googleResponse.authentication?.idToken;
      if (idToken) {
        linkGoogle(idToken);
      }
    }
  }, [googleResponse]);

  const fetchUserInfo = async () => {
    try {
      const user = await apiGetMe();
      setIsGoogleLinked(user.providers?.includes("google") ?? false);
      setGoogleEmail(user.providerEmails?.google ?? null);
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  };

  const linkGoogle = async (credential: string) => {
    setIsLinking(true);
    setMessage(null);
    try {
      await apiGoogleLink(credential);
      await fetchUserInfo();
      setMessage({ type: "success", text: "Googleアカウントを連携しました" });
    } catch (e) {
      setMessage({
        type: "error",
        text: e instanceof Error ? e.message : "連携に失敗しました",
      });
    } finally {
      setIsLinking(false);
    }
  };

  return {
    isGoogleLinked,
    googleEmail,
    isLoading,
    isLinking,
    message,
    googleRequest,
    googlePromptAsync,
  };
}

function useAppSettings() {
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  useEffect(() => {
    AsyncStorage.getItem(SETTINGS_KEY).then((raw) => {
      if (!raw) return;
      try {
        setSettings({ ...defaultSettings, ...JSON.parse(raw) });
      } catch {
        AsyncStorage.removeItem(SETTINGS_KEY);
      }
    });
  }, []);
  const updateSetting = (key: keyof AppSettings, value: boolean) => {
    setSettings((prev) => {
      const next = { ...prev, [key]: value };
      AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
      return next;
    });
  };
  return { settings, updateSetting };
}

export function SettingsPage() {
  const { userId, logout } = useAuthContext();
  const { settings, updateSetting } = useAppSettings();
  const google = useGoogleAccount();
  const [showImport, setShowImport] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [legalModal, setLegalModal] = useState<"privacy" | "terms" | null>(
    null,
  );

  const handleClearData = async () => {
    await clearLocalData();
    setShowClearConfirm(false);
  };

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

  const shadow = {
    shadowColor: "#1c1917",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  };

  return (
    <ScrollView className="flex-1">
      {/* User info */}
      <View
        className="mx-4 mt-4 p-4 bg-white rounded-2xl border border-gray-200"
        style={shadow}
      >
        <View className="flex-row items-center">
          <View className="w-10 h-10 bg-amber-100 rounded-full items-center justify-center">
            <User size={20} color="#f59e0b" />
          </View>
          <View className="ml-3 flex-1">
            <Text className="text-sm text-gray-500">ユーザーID</Text>
            <Text className="text-xs text-gray-400 mt-0.5" numberOfLines={1}>
              {userId || "未ログイン"}
            </Text>
          </View>
        </View>
      </View>

      {/* Google account linking */}
      <Section icon={Link} label="Google連携" shadow={shadow}>
        {google.isLoading ? (
          <View className="px-4 py-3">
            <Text className="text-sm text-gray-500">読み込み中...</Text>
          </View>
        ) : (
          <View className="px-4 py-3 gap-2">
            {google.isGoogleLinked ? (
              <View className="flex-row items-center gap-2">
                <Text className="text-sm text-green-700 font-medium">
                  Google連携済み
                </Text>
                {google.googleEmail && (
                  <Text className="text-xs text-gray-500">
                    {google.googleEmail}
                  </Text>
                )}
              </View>
            ) : (
              <Text className="text-xs text-gray-500">
                Googleアカウントを連携すると、Googleログインでもこのアカウントにアクセスできます。
              </Text>
            )}
            <TouchableOpacity
              className={`flex-row items-center justify-center py-2.5 rounded-lg border border-gray-300 bg-white ${
                google.isLinking || !google.googleRequest ? "opacity-50" : ""
              }`}
              onPress={() => google.googlePromptAsync()}
              disabled={google.isLinking || !google.googleRequest}
            >
              <Text className="text-sm font-medium text-gray-700">
                {google.isLinking
                  ? "連携中..."
                  : google.isGoogleLinked
                    ? "Googleアカウントを変更"
                    : "Googleアカウントを連携"}
              </Text>
            </TouchableOpacity>
          </View>
        )}
        {google.message && (
          <>
            <Divider />
            <View className="px-4 py-2">
              <Text
                className={`text-xs ${google.message.type === "success" ? "text-green-600" : "text-red-500"}`}
              >
                {google.message.text}
              </Text>
            </View>
          </>
        )}
      </Section>

      {/* App settings */}
      <Section icon={Settings} label="アプリ設定" shadow={shadow}>
        <SettingSwitch
          label="起動時に目標画面を表示"
          desc="アプリ起動時の初期画面を目標画面にします"
          value={settings.showGoalOnStartup}
          onChange={(v) => updateSetting("showGoalOnStartup", v)}
        />
        <Divider />
        <SettingSwitch
          label="やらなかった日付をデフォルトで表示"
          desc="目標詳細で活動がなかった日付を表示します"
          value={settings.showInactiveDates}
          onChange={(v) => updateSetting("showInactiveDates", v)}
        />
        <Divider />
        <SettingSwitch
          label="褒めモード"
          desc="記録時のフィードバックに褒めメッセージと演出を追加します"
          value={settings.praiseMode}
          onChange={(v) => updateSetting("praiseMode", v)}
        />
      </Section>

      {/* Data management */}
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

      {/* Account */}
      <Section icon={User} label="アカウント" shadow={shadow}>
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
        <Divider />
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

      {/* App version */}
      <View className="items-center mt-8 mb-8 gap-2">
        <View className="flex-row items-center">
          <Info size={14} color="#9ca3af" />
          <Text className="ml-1 text-xs text-gray-400">Actiko v1.0.0</Text>
        </View>
        <View className="flex-row gap-3">
          <TouchableOpacity onPress={() => setLegalModal("privacy")}>
            <Text className="text-xs text-blue-500 underline">
              プライバシーポリシー
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setLegalModal("terms")}>
            <Text className="text-xs text-blue-500 underline">利用規約</Text>
          </TouchableOpacity>
        </View>
      </View>

      <CSVImportModal
        visible={showImport}
        onClose={() => setShowImport(false)}
      />
      <CSVExportModal
        visible={showExport}
        onClose={() => setShowExport(false)}
      />
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

function Section({
  icon: Icon,
  label,
  shadow,
  children,
}: {
  icon: React.ComponentType<{ size: number; color: string }>;
  label: string;
  shadow: {
    shadowColor: string;
    shadowOffset: { width: number; height: number };
    shadowOpacity: number;
    shadowRadius: number;
    elevation: number;
  };
  children: React.ReactNode;
}) {
  return (
    <View className="mx-4 mt-4">
      <View className="flex-row items-center mb-2 ml-1">
        <Icon size={14} color="#9ca3af" />
        <Text className="ml-1.5 text-xs text-gray-400 uppercase tracking-wide">
          {label}
        </Text>
      </View>
      <View
        className="bg-white rounded-2xl border border-gray-200 overflow-hidden"
        style={shadow}
      >
        {children}
      </View>
    </View>
  );
}

function Divider() {
  return <View className="border-t border-gray-100 mx-4" />;
}

function SettingSwitch({
  label,
  desc,
  value,
  onChange,
}: {
  label: string;
  desc: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <View className="flex-row items-center px-4 py-3">
      <View className="flex-1 mr-3">
        <Text className="text-sm font-medium text-gray-900">{label}</Text>
        <Text className="text-xs text-gray-500 mt-0.5">{desc}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: "#d1d5db", true: "#3b82f6" }}
        thumbColor={Platform.OS === "android" ? "#fff" : undefined}
      />
    </View>
  );
}

function InlineConfirm({
  message,
  onConfirm,
  onCancel,
  confirmLabel = "削除する",
  error,
  disabled = false,
}: {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmLabel?: string;
  error?: string;
  disabled?: boolean;
}) {
  return (
    <View className="mx-3 my-2 bg-red-50 border border-red-200 rounded-lg p-4">
      <Text className="text-sm text-red-700 font-medium mb-3">{message}</Text>
      {error ? (
        <Text className="text-xs text-red-600 mb-2">{error}</Text>
      ) : null}
      <View className="flex-row gap-2">
        <TouchableOpacity
          className={`px-4 py-2 bg-red-600 rounded-lg ${disabled ? "opacity-50" : ""}`}
          onPress={onConfirm}
          disabled={disabled}
        >
          <Text className="text-sm text-white font-medium">
            {disabled ? "処理中..." : confirmLabel}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          className="px-4 py-2 border border-gray-300 rounded-lg"
          onPress={onCancel}
          disabled={disabled}
        >
          <Text className="text-sm text-gray-700">キャンセル</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

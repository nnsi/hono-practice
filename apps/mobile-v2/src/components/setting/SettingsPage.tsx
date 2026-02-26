import { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
} from "react-native";
import {
  Upload,
  Download,
  LogOut,
  User,
  Info,
} from "lucide-react-native";
import { useAuthContext } from "../../../app/_layout";
import { CSVImportModal } from "../csv/CSVImportModal";
import { CSVExportModal } from "../csv/CSVExportModal";

export function SettingsPage() {
  const { userId, logout } = useAuthContext();
  const [showImport, setShowImport] = useState(false);
  const [showExport, setShowExport] = useState(false);

  const handleLogout = () => {
    Alert.alert("ログアウト", "ログアウトしますか？", [
      { text: "キャンセル", style: "cancel" },
      {
        text: "ログアウト",
        style: "destructive",
        onPress: () => logout(),
      },
    ]);
  };

  return (
    <ScrollView className="flex-1 bg-gray-50">
      {/* User info */}
      <View className="mx-4 mt-4 p-4 bg-white rounded-xl border border-gray-200">
        <View className="flex-row items-center">
          <View className="w-10 h-10 bg-blue-100 rounded-full items-center justify-center">
            <User size={20} color="#3b82f6" />
          </View>
          <View className="ml-3 flex-1">
            <Text className="text-sm text-gray-500">ユーザーID</Text>
            <Text
              className="text-xs text-gray-400 mt-0.5"
              numberOfLines={1}
            >
              {userId || "未ログイン"}
            </Text>
          </View>
        </View>
      </View>

      {/* CSV */}
      <View className="mx-4 mt-4">
        <Text className="text-xs text-gray-400 uppercase tracking-wide mb-2 ml-1">
          データ管理
        </Text>
        <View className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <TouchableOpacity
            className="flex-row items-center px-4 py-3 border-b border-gray-100"
            onPress={() => setShowImport(true)}
          >
            <Upload size={18} color="#6b7280" />
            <Text className="ml-3 text-base text-gray-700">
              CSVインポート
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="flex-row items-center px-4 py-3"
            onPress={() => setShowExport(true)}
          >
            <Download size={18} color="#6b7280" />
            <Text className="ml-3 text-base text-gray-700">
              CSVエクスポート
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Account */}
      <View className="mx-4 mt-4">
        <Text className="text-xs text-gray-400 uppercase tracking-wide mb-2 ml-1">
          アカウント
        </Text>
        <View className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <TouchableOpacity
            className="flex-row items-center px-4 py-3"
            onPress={handleLogout}
          >
            <LogOut size={18} color="#ef4444" />
            <Text className="ml-3 text-base text-red-500">ログアウト</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* App version */}
      <View className="items-center mt-8 mb-8">
        <View className="flex-row items-center">
          <Info size={14} color="#9ca3af" />
          <Text className="ml-1 text-xs text-gray-400">Actiko v1.0.0</Text>
        </View>
      </View>

      {/* Modals */}
      <CSVImportModal
        visible={showImport}
        onClose={() => setShowImport(false)}
      />
      <CSVExportModal
        visible={showExport}
        onClose={() => setShowExport(false)}
      />
    </ScrollView>
  );
}

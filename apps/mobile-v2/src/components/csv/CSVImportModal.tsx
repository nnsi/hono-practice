import { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  ScrollView,
} from "react-native";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
import { ModalOverlay } from "../common/ModalOverlay";
import { useActivities } from "../../hooks/useActivities";
import { activityLogRepository } from "../../repositories/activityLogRepository";
import dayjs from "dayjs";

type CSVImportModalProps = {
  visible: boolean;
  onClose: () => void;
};

type ParsedRow = {
  date: string;
  time: string;
  quantity: string;
  memo: string;
};

export function CSVImportModal({ visible, onClose }: CSVImportModalProps) {
  const { activities } = useActivities();
  const [selectedActivityId, setSelectedActivityId] = useState<string | null>(
    null
  );
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  const resetForm = () => {
    setSelectedActivityId(null);
    setParsedRows([]);
    setFileName(null);
  };

  const handlePickFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "text/csv",
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets?.[0]) return;

      const asset = result.assets[0];
      setFileName(asset.name);

      const content = await FileSystem.readAsStringAsync(asset.uri, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      const lines = content.split("\n").filter((line) => line.trim());
      if (lines.length <= 1) {
        Alert.alert("エラー", "CSVデータが空です");
        return;
      }

      // Skip header row, parse data rows
      const rows: ParsedRow[] = [];
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
        rows.push({
          date: cols[0] || dayjs().format("YYYY-MM-DD"),
          time: cols[1] || "",
          quantity: cols[2] || "",
          memo: cols[3] || "",
        });
      }
      setParsedRows(rows);
    } catch (e) {
      Alert.alert("エラー", "ファイルの読み込みに失敗しました");
    }
  };

  const handleImport = async () => {
    if (!selectedActivityId) {
      Alert.alert("エラー", "アクティビティを選択してください");
      return;
    }
    if (parsedRows.length === 0) {
      Alert.alert("エラー", "インポートするデータがありません");
      return;
    }
    setIsImporting(true);
    try {
      for (const row of parsedRows) {
        await activityLogRepository.createActivityLog({
          activityId: selectedActivityId,
          activityKindId: null,
          quantity: row.quantity ? Number(row.quantity) : null,
          memo: row.memo,
          date: row.date,
          time: row.time || null,
        });
      }
      Alert.alert("完了", `${parsedRows.length}件のログをインポートしました`);
      resetForm();
      onClose();
    } catch (e) {
      Alert.alert("エラー", "インポートに失敗しました");
    } finally {
      setIsImporting(false);
    }
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <ModalOverlay visible={visible} onClose={handleClose} title="CSVインポート">
      <View className="gap-4">
        {/* Activity picker */}
        <View>
          <Text className="text-sm text-gray-500 mb-1">アクティビティ</Text>
          <View className="flex-row flex-wrap gap-2">
            {activities.map((a) => (
              <TouchableOpacity
                key={a.id}
                onPress={() => setSelectedActivityId(a.id)}
                className={`px-3 py-1.5 rounded-full border ${
                  selectedActivityId === a.id
                    ? "bg-blue-500 border-blue-500"
                    : "bg-white border-gray-300"
                }`}
              >
                <Text
                  className={`text-sm ${
                    selectedActivityId === a.id
                      ? "text-white font-medium"
                      : "text-gray-700"
                  }`}
                >
                  {a.emoji} {a.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* File picker */}
        <TouchableOpacity
          className="py-3 border-2 border-dashed border-gray-300 rounded-xl items-center"
          onPress={handlePickFile}
        >
          <Text className="text-sm text-gray-500">
            {fileName || "CSVファイルを選択"}
          </Text>
        </TouchableOpacity>

        {/* Preview */}
        {parsedRows.length > 0 ? (
          <View>
            <Text className="text-sm text-gray-500 mb-1">
              プレビュー（先頭5件 / 全{parsedRows.length}件）
            </Text>
            <View className="bg-gray-50 rounded-lg p-2">
              {parsedRows.slice(0, 5).map((row, i) => (
                <View
                  key={`row-${i}`}
                  className="flex-row py-1 border-b border-gray-200"
                >
                  <Text className="text-xs text-gray-600 w-24">
                    {row.date}
                  </Text>
                  <Text className="text-xs text-gray-600 w-14">
                    {row.time}
                  </Text>
                  <Text className="text-xs text-gray-600 w-14">
                    {row.quantity}
                  </Text>
                  <Text
                    className="text-xs text-gray-600 flex-1"
                    numberOfLines={1}
                  >
                    {row.memo}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {/* Import button */}
        <TouchableOpacity
          className={`mt-2 mb-4 py-3 rounded-xl items-center ${
            isImporting || !selectedActivityId || parsedRows.length === 0
              ? "bg-blue-300"
              : "bg-blue-500"
          }`}
          onPress={handleImport}
          disabled={isImporting || !selectedActivityId || parsedRows.length === 0}
        >
          <Text className="text-white font-bold text-base">
            {isImporting
              ? "インポート中..."
              : `インポート (${parsedRows.length}件)`}
          </Text>
        </TouchableOpacity>
      </View>
    </ModalOverlay>
  );
}

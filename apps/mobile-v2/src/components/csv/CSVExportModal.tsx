import { useState, useMemo } from "react";
import { View, Text, TextInput, TouchableOpacity, Alert } from "react-native";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import dayjs from "dayjs";
import { ModalOverlay } from "../common/ModalOverlay";
import { DatePickerField } from "../common/DatePickerField";
import { useActivities } from "../../hooks/useActivities";
import { activityLogRepository } from "../../repositories/activityLogRepository";

type CSVExportModalProps = {
  visible: boolean;
  onClose: () => void;
};

export function CSVExportModal({ visible, onClose }: CSVExportModalProps) {
  const { activities } = useActivities();
  const [startDate, setStartDate] = useState(
    dayjs().subtract(30, "day").format("YYYY-MM-DD")
  );
  const [endDate, setEndDate] = useState(dayjs().format("YYYY-MM-DD"));
  const [isExporting, setIsExporting] = useState(false);

  const activityMap = useMemo(() => {
    const map = new Map<string, { name: string; emoji: string }>();
    for (const a of activities) {
      map.set(a.id, { name: a.name, emoji: a.emoji });
    }
    return map;
  }, [activities]);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      // Collect logs for each date in the range
      const allLogs: Array<{
        date: string;
        time: string | null;
        activityName: string;
        quantity: number | null;
        memo: string;
      }> = [];

      let current = dayjs(startDate);
      const end = dayjs(endDate);

      while (current.isBefore(end, "day") || current.isSame(end, "day")) {
        const dateStr = current.format("YYYY-MM-DD");
        const logs =
          await activityLogRepository.getActivityLogsByDate(dateStr);

        for (const log of logs) {
          const activity = activityMap.get(log.activityId);
          allLogs.push({
            date: log.date,
            time: log.time,
            activityName: activity?.name || "不明",
            quantity: log.quantity,
            memo: log.memo,
          });
        }
        current = current.add(1, "day");
      }

      if (allLogs.length === 0) {
        Alert.alert("情報", "エクスポートするデータがありません");
        setIsExporting(false);
        return;
      }

      // Build CSV
      const header = "日付,時刻,アクティビティ,数量,メモ";
      const rows = allLogs.map(
        (l) =>
          `"${l.date}","${l.time || ""}","${l.activityName}","${l.quantity ?? ""}","${(l.memo || "").replace(/"/g, '""')}"`
      );
      const csv = [header, ...rows].join("\n");

      // Write to temp file and share
      const fileUri = `${FileSystem.cacheDirectory}actiko-export-${dayjs().format("YYYYMMDD-HHmmss")}.csv`;
      await FileSystem.writeAsStringAsync(fileUri, csv, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(fileUri, {
          mimeType: "text/csv",
          dialogTitle: "CSVエクスポート",
        });
      } else {
        Alert.alert("エラー", "共有機能が利用できません");
      }
    } catch (e) {
      Alert.alert("エラー", "エクスポートに失敗しました");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <ModalOverlay visible={visible} onClose={onClose} title="CSVエクスポート">
      <View className="gap-4">
        <DatePickerField
          value={startDate}
          onChange={setStartDate}
          label="開始日"
        />

        <DatePickerField
          value={endDate}
          onChange={setEndDate}
          label="終了日"
        />

        <View className="p-3 bg-gray-50 rounded-lg">
          <Text className="text-xs text-gray-500">
            選択期間のすべてのアクティビティログをCSV形式でエクスポートします。
          </Text>
        </View>

        <TouchableOpacity
          className={`mt-2 mb-4 py-3 rounded-xl items-center ${
            isExporting ? "bg-blue-300" : "bg-blue-500"
          }`}
          onPress={handleExport}
          disabled={isExporting}
        >
          <Text className="text-white font-bold text-base">
            {isExporting ? "エクスポート中..." : "エクスポート"}
          </Text>
        </TouchableOpacity>
      </View>
    </ModalOverlay>
  );
}

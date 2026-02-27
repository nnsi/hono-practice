import { useState, useMemo } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import { CheckCircle, Download } from "lucide-react-native";
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
    dayjs().subtract(30, "day").format("YYYY-MM-DD"),
  );
  const [endDate, setEndDate] = useState(dayjs().format("YYYY-MM-DD"));
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultCount, setResultCount] = useState<number | null>(null);

  const activityMap = useMemo(() => {
    const map = new Map<string, { name: string; emoji: string }>();
    for (const a of activities) {
      map.set(a.id, { name: a.name, emoji: a.emoji });
    }
    return map;
  }, [activities]);

  const handleExport = async () => {
    setIsExporting(true);
    setError(null);
    setResultCount(null);

    try {
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
        setError("エクスポートするデータがありません");
        setIsExporting(false);
        return;
      }

      const header = "日付,時刻,アクティビティ,数量,メモ";
      const rows = allLogs.map(
        (l) =>
          `"${l.date}","${l.time || ""}","${l.activityName}","${l.quantity ?? ""}","${(l.memo || "").replace(/"/g, '""')}"`,
      );
      const csv = [header, ...rows].join("\n");

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
        setResultCount(allLogs.length);
      } else {
        setError("共有機能が利用できません");
      }
    } catch {
      setError("エクスポートに失敗しました");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <ModalOverlay visible={visible} onClose={onClose} title="CSVエクスポート">
      <View className="gap-4 pb-4">
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

        {/* Error */}
        {error && (
          <View className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <Text className="text-sm text-red-700">{error}</Text>
          </View>
        )}

        {/* Success */}
        {resultCount !== null && (
          <View className="p-3 bg-green-50 border border-green-200 rounded-lg flex-row items-center">
            <CheckCircle size={16} color="#16a34a" />
            <Text className="text-sm text-green-700 ml-2">
              {resultCount}件の活動記録をエクスポートしました
            </Text>
          </View>
        )}

        <TouchableOpacity
          className={`py-3 rounded-xl items-center flex-row justify-center ${
            isExporting ? "bg-gray-400" : "bg-gray-900"
          }`}
          onPress={handleExport}
          disabled={isExporting}
        >
          <Download size={16} color="#ffffff" />
          <Text className="text-white font-bold text-base ml-2">
            {isExporting ? "エクスポート中..." : "CSVをエクスポート"}
          </Text>
        </TouchableOpacity>

        <Text className="text-xs text-gray-400 text-center">
          形式: date, time, activity, quantity, memo（CSVインポート互換）
        </Text>
      </View>
    </ModalOverlay>
  );
}

import { useState, useMemo } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { writeAsStringAsync, EncodingType, cacheDirectory } from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { CheckCircle, Download } from "lucide-react-native";
import dayjs from "dayjs";
import { buildCSVContent } from "@packages/domain/csv/csvExport";
import { ModalOverlay } from "../common/ModalOverlay";
import { DatePickerField } from "../common/DatePickerField";
import { useActivities } from "../../hooks/useActivities";
import { useActivityKinds } from "../../hooks/useActivityKinds";
import { activityLogRepository } from "../../repositories/activityLogRepository";

type CSVExportModalProps = {
  visible: boolean;
  onClose: () => void;
};

export function CSVExportModal({ visible, onClose }: CSVExportModalProps) {
  const { activities } = useActivities();
  const { kinds: allKinds } = useActivityKinds();
  const [startDate, setStartDate] = useState(
    dayjs().subtract(30, "day").format("YYYY-MM-DD"),
  );
  const [endDate, setEndDate] = useState(dayjs().format("YYYY-MM-DD"));
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultCount, setResultCount] = useState<number | null>(null);

  const activityMap = useMemo(() => {
    const map = new Map<string, { name: string }>();
    for (const a of activities) {
      map.set(a.id, { name: a.name });
    }
    return map;
  }, [activities]);

  const kindMap = useMemo(() => {
    const map = new Map<string, { name: string }>();
    for (const k of allKinds) {
      map.set(k.id, { name: k.name });
    }
    return map;
  }, [allKinds]);

  const handleExport = async () => {
    // Date range validation
    if (!startDate || !endDate) {
      setError("開始日と終了日を指定してください");
      return;
    }
    if (startDate > endDate) {
      setError("開始日は終了日より前にしてください");
      return;
    }

    setIsExporting(true);
    setError(null);
    setResultCount(null);

    try {
      const logs = await activityLogRepository.getActivityLogsBetween(startDate, endDate);

      if (logs.length === 0) {
        setError("エクスポートするデータがありません");
        setIsExporting(false);
        return;
      }

      // Use domain buildCSVContent for proper escaping and kind data
      const csvContent = buildCSVContent(
        logs.map((l) => ({
          activityId: l.activityId,
          activityKindId: l.activityKindId,
          date: l.date,
          quantity: l.quantity,
          memo: l.memo,
        })),
        activityMap,
        kindMap,
      );

      const fileUri = `${cacheDirectory}actiko-export-${dayjs().format("YYYYMMDD-HHmmss")}.csv`;
      await writeAsStringAsync(fileUri, csvContent, {
        encoding: EncodingType.UTF8,
      });

      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(fileUri, {
          mimeType: "text/csv",
          dialogTitle: "CSVエクスポート",
        });
        setResultCount(logs.length);
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
          形式: date, activity, kind, quantity, memo（CSVインポート互換）
        </Text>
      </View>
    </ModalOverlay>
  );
}

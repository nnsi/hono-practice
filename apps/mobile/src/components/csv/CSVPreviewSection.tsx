import { AlertCircle, CheckCircle } from "lucide-react-native";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";

type ParsedRow = { date: string; time: string; quantity: string; memo: string };

export function CSVPreviewSection({
  parsedRows,
  validationResults,
  validCount,
  errorCount,
  isImporting,
  selectedActivityId,
  onImport,
  onBack,
}: {
  parsedRows: ParsedRow[];
  validationResults: string[][];
  validCount: number;
  errorCount: number;
  isImporting: boolean;
  selectedActivityId: string | null;
  onImport: () => void;
  onBack: () => void;
}) {
  return (
    <View className="gap-3">
      {/* Summary badges */}
      <View className="flex-row gap-2">
        <View className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded">
          <Text className="text-xs text-gray-600 dark:text-gray-400">
            全{parsedRows.length}件
          </Text>
        </View>
        <View className="px-2 py-1 bg-green-100 rounded">
          <Text className="text-xs text-green-700 dark:text-green-400">
            有効 {validCount}件
          </Text>
        </View>
        {errorCount > 0 && (
          <View className="px-2 py-1 bg-red-100 rounded">
            <Text className="text-xs text-red-700 dark:text-red-400">
              エラー {errorCount}件
            </Text>
          </View>
        )}
      </View>

      {/* Preview rows */}
      <ScrollView
        className="bg-gray-50 dark:bg-gray-800 rounded-lg p-2"
        style={{ maxHeight: 240 }}
        nestedScrollEnabled
      >
        {/* Header */}
        <View className="flex-row py-1 border-b border-gray-300 dark:border-gray-600">
          <Text className="text-xs font-medium text-gray-500 dark:text-gray-400 w-6" />
          <Text className="text-xs font-medium text-gray-500 dark:text-gray-400 w-24">
            日付
          </Text>
          <Text className="text-xs font-medium text-gray-500 dark:text-gray-400 w-14">
            時刻
          </Text>
          <Text className="text-xs font-medium text-gray-500 dark:text-gray-400 w-14">
            数量
          </Text>
          <Text className="text-xs font-medium text-gray-500 dark:text-gray-400 flex-1">
            メモ
          </Text>
        </View>
        {parsedRows.map((row, i) => {
          const errors = validationResults[i] ?? [];
          const hasError = errors.length > 0;
          return (
            <View
              key={`${i}-${row.date}-${row.quantity}`}
              className={`py-1 border-b border-gray-200 dark:border-gray-700 ${hasError ? "bg-red-50 dark:bg-red-900/20" : ""}`}
            >
              <View className="flex-row items-center">
                <View className="w-6 items-center">
                  {hasError ? (
                    <AlertCircle size={12} color="#ef4444" />
                  ) : (
                    <CheckCircle size={12} color="#22c55e" />
                  )}
                </View>
                <Text className="text-xs text-gray-600 dark:text-gray-400 w-24">
                  {row.date}
                </Text>
                <Text className="text-xs text-gray-600 dark:text-gray-400 w-14">
                  {row.time}
                </Text>
                <Text className="text-xs text-gray-600 dark:text-gray-400 w-14">
                  {row.quantity}
                </Text>
                <Text
                  className="text-xs text-gray-600 dark:text-gray-400 flex-1"
                  numberOfLines={1}
                >
                  {row.memo}
                </Text>
              </View>
              {hasError && (
                <Text className="text-xs text-red-500 dark:text-red-400 ml-6 mt-0.5">
                  {errors.join(", ")}
                </Text>
              )}
            </View>
          );
        })}
      </ScrollView>

      {errorCount > 0 && (
        <Text className="text-xs text-gray-500 dark:text-gray-400">
          エラーのある行はスキップされます
        </Text>
      )}

      <TouchableOpacity
        className={`py-3 rounded-xl items-center ${isImporting || !selectedActivityId || validCount === 0 ? "bg-gray-400" : "bg-gray-900"}`}
        onPress={onImport}
        disabled={isImporting || !selectedActivityId || validCount === 0}
        accessibilityRole="button"
        accessibilityLabel={
          isImporting ? "インポート中..." : `インポート (${validCount}件)`
        }
      >
        <Text className="text-white font-bold text-base">
          {isImporting ? "インポート中..." : `インポート (${validCount}件)`}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        className="py-2 items-center"
        onPress={onBack}
        accessibilityRole="button"
        accessibilityLabel="ファイルを選び直す"
      >
        <Text className="text-sm text-gray-500 dark:text-gray-400">
          ファイルを選び直す
        </Text>
      </TouchableOpacity>
    </View>
  );
}

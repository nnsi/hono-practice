import { useMemo, useState } from "react";

import { buildDedupKey, buildDedupSet } from "@packages/domain/csv/csvDedup";
import {
  autoDetectMapping,
  parseCSVText,
  validateDate,
  validateQuantity,
} from "@packages/domain/csv/csvParser";
import dayjs from "dayjs";
import * as DocumentPicker from "expo-document-picker";
import { EncodingType, readAsStringAsync } from "expo-file-system/legacy";
import {
  AlertCircle,
  CheckCircle,
  Download,
  FileText,
  Upload,
} from "lucide-react-native";
import {
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { useActivities } from "../../hooks/useActivities";
import { activityLogRepository } from "../../repositories/activityLogRepository";
import { syncEngine } from "../../sync/syncEngine";
import { ModalOverlay } from "../common/ModalOverlay";

type CSVImportModalProps = { visible: boolean; onClose: () => void };
type ParsedRow = { date: string; time: string; quantity: string; memo: string };
type Step = "file" | "preview";

function validateRow(row: ParsedRow): string[] {
  const errors: string[] = [];
  const dateError = validateDate(
    row.date.includes("T") ? row.date.split("T")[0] : row.date,
  );
  if (dateError) errors.push(dateError);
  if (row.quantity) {
    const { error } = validateQuantity(row.quantity);
    if (error) errors.push(error);
  }
  return errors;
}

function downloadTemplateWeb() {
  const template =
    "date,activity,kind,quantity,memo\n2024-01-01,ランニング,ジョギング,5,朝ラン\n2024-01-02,読書,技術書,60,TypeScript本";
  const blob = new Blob([template], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "activity_log_template.csv";
  link.click();
  URL.revokeObjectURL(url);
}

export function CSVImportModal({ visible, onClose }: CSVImportModalProps) {
  const { activities } = useActivities();
  const [step, setStep] = useState<Step>("file");
  const [selectedActivityId, setSelectedActivityId] = useState<string | null>(
    null,
  );
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [progress, setProgress] = useState({
    processed: 0,
    total: 0,
    succeeded: 0,
    failed: 0,
  });
  const [error, setError] = useState<string | null>(null);
  const [successCount, setSuccessCount] = useState<number | null>(null);

  const validationResults = useMemo(() => {
    if (parsedRows.length === 0) return [];
    return parsedRows.map((row) => validateRow(row));
  }, [parsedRows]);

  const validCount = validationResults.filter((e) => e.length === 0).length;
  const errorCount = validationResults.filter((e) => e.length > 0).length;

  const resetForm = () => {
    setStep("file");
    setSelectedActivityId(null);
    setParsedRows([]);
    setFileName(null);
    setIsParsing(false);
    setIsImporting(false);
    setProgress({ processed: 0, total: 0, succeeded: 0, failed: 0 });
    setError(null);
    setSuccessCount(null);
  };

  const handlePickAndParse = async () => {
    setIsParsing(true);
    setError(null);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "text/csv",
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets?.[0]) {
        setIsParsing(false);
        return;
      }
      const asset = result.assets[0];
      setFileName(asset.name);

      const content = await readAsStringAsync(asset.uri, {
        encoding: EncodingType.UTF8,
      });

      // Use domain parseCSVText for proper CSV parsing (handles quoted fields)
      const csvResult = parseCSVText(content);
      if (csvResult.data.length === 0) {
        setError("CSVデータが空です");
        setIsParsing(false);
        return;
      }

      // Use domain autoDetectMapping for column detection
      const mapping = autoDetectMapping(csvResult.headers);

      // Also detect time column (not covered by domain autoDetectMapping)
      const timeCol = csvResult.headers.find((h) => {
        const lower = h.toLowerCase();
        return lower.includes("time") || lower.includes("時刻");
      });

      // Map parsed records to rows using detected mapping
      const rows: ParsedRow[] = csvResult.data.map((record) => ({
        date:
          (mapping.date
            ? record[mapping.date]
            : record[csvResult.headers[0]]) || dayjs().format("YYYY-MM-DD"),
        time: (timeCol ? record[timeCol] : "") || "",
        quantity:
          (mapping.quantity
            ? record[mapping.quantity]
            : record[csvResult.headers[2]]) || "",
        memo:
          (mapping.memo
            ? record[mapping.memo]
            : record[csvResult.headers[3]]) || "",
      }));

      setParsedRows(rows);
      setStep("preview");
    } catch {
      setError("ファイルの読み込みに失敗しました");
    } finally {
      setIsParsing(false);
    }
  };

  const handleImport = async () => {
    if (!selectedActivityId) {
      setError("アクティビティを選択してください");
      return;
    }
    if (parsedRows.length === 0) {
      setError("インポートするデータがありません");
      return;
    }

    // Only import valid rows
    const validRows = parsedRows.filter(
      (_, i) => validationResults[i].length === 0,
    );
    if (validRows.length === 0) {
      setError("有効なデータがありません");
      return;
    }

    setIsImporting(true);
    setError(null);
    setProgress({
      processed: 0,
      total: validRows.length,
      succeeded: 0,
      failed: 0,
    });

    let succeeded = 0;
    let skipped = 0;
    let failed = 0;

    try {
      // 重複チェック: インポート対象日の既存ログを取得してdedupSetを構築
      const dates = validRows.map((r) =>
        r.date.includes("T") ? r.date.split("T")[0] : r.date,
      );
      const minDate = dates.reduce((a, b) => (a < b ? a : b));
      const maxDate = dates.reduce((a, b) => (a > b ? a : b));
      const existingLogs = await activityLogRepository.getActivityLogsBetween(
        minDate,
        maxDate,
      );
      const dedupSet = buildDedupSet(existingLogs);

      for (let i = 0; i < validRows.length; i++) {
        const row = validRows[i];
        try {
          const quantity = row.quantity ? Number(row.quantity) : null;

          // Format date (handle ISO datetime format)
          const date = row.date.includes("T")
            ? row.date.split("T")[0]
            : row.date;

          const memo = row.memo;
          const dedupKey = buildDedupKey({
            date,
            activityId: selectedActivityId,
            quantity,
            memo,
          });
          if (dedupSet.has(dedupKey)) {
            skipped++;
            continue;
          }

          await activityLogRepository.createActivityLog({
            activityId: selectedActivityId,
            activityKindId: null,
            quantity,
            memo,
            date,
            time: row.time || null,
            taskId: null,
          });
          dedupSet.add(dedupKey);
          succeeded++;
        } catch {
          failed++;
        }
        setProgress({
          processed: i + 1,
          total: validRows.length,
          succeeded,
          failed,
        });
      }

      // Trigger sync after import
      syncEngine.syncAll();

      const messages: string[] = [];
      if (skipped > 0) messages.push(`${skipped}件は重複のためスキップ`);
      if (failed > 0) messages.push(`${failed}件のインポートに失敗`);

      setSuccessCount(succeeded);
      if (messages.length > 0) {
        setError(messages.join("、"));
      }
    } catch {
      setError("インポートに失敗しました");
    } finally {
      setIsImporting(false);
    }
  };

  const handleClose = () => {
    if (!isImporting) {
      resetForm();
      onClose();
    }
  };

  return (
    <ModalOverlay visible={visible} onClose={handleClose} title="CSVインポート">
      <View className="gap-4 pb-4">
        <StepIndicator current={step} />

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
                    ? "bg-amber-500 border-amber-500"
                    : "bg-white border-gray-300"
                }`}
              >
                <Text
                  className={`text-sm ${selectedActivityId === a.id ? "text-white font-medium" : "text-gray-700"}`}
                >
                  {a.emoji} {a.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* File step */}
        {step === "file" && (
          <View className="gap-3">
            <TouchableOpacity
              className="py-6 border-2 border-dashed border-gray-300 rounded-xl items-center"
              onPress={handlePickAndParse}
              disabled={isParsing}
            >
              <Upload size={28} color="#9ca3af" />
              <Text className="text-sm text-gray-500 mt-2">
                {isParsing ? "解析中..." : "CSVファイルを選択して解析"}
              </Text>
              {fileName && (
                <View className="flex-row items-center mt-1">
                  <FileText size={12} color="#6b7280" />
                  <Text className="text-xs text-gray-400 ml-1">{fileName}</Text>
                </View>
              )}
            </TouchableOpacity>
            {Platform.OS === "web" && (
              <TouchableOpacity
                className="flex-row items-center justify-center gap-2 py-2 border border-gray-300 rounded-lg"
                onPress={downloadTemplateWeb}
              >
                <Download size={14} color="#6b7280" />
                <Text className="text-sm text-gray-600">
                  CSVテンプレートをダウンロード
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {error && (
          <View className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <Text className="text-sm text-red-700">{error}</Text>
          </View>
        )}
        {successCount !== null && (
          <View className="p-3 bg-green-50 border border-green-200 rounded-lg">
            <Text className="text-sm text-green-700">
              {successCount}件のログをインポートしました
            </Text>
          </View>
        )}
        {isImporting && progress.total > 0 && (
          <View className="gap-1">
            <View className="w-full bg-gray-200 rounded-full h-2">
              <View
                className="bg-blue-600 h-2 rounded-full"
                style={{
                  width: `${(progress.processed / progress.total) * 100}%`,
                }}
              />
            </View>
            <Text className="text-xs text-center text-gray-600">
              {progress.succeeded} / {progress.total} 件処理中...
            </Text>
          </View>
        )}

        {/* Preview step */}
        {step === "preview" && parsedRows.length > 0 && !successCount && (
          <View className="gap-3">
            {/* Summary badges */}
            <View className="flex-row gap-2">
              <View className="px-2 py-1 bg-gray-100 rounded">
                <Text className="text-xs text-gray-600">
                  全{parsedRows.length}件
                </Text>
              </View>
              <View className="px-2 py-1 bg-green-100 rounded">
                <Text className="text-xs text-green-700">
                  有効 {validCount}件
                </Text>
              </View>
              {errorCount > 0 && (
                <View className="px-2 py-1 bg-red-100 rounded">
                  <Text className="text-xs text-red-700">
                    エラー {errorCount}件
                  </Text>
                </View>
              )}
            </View>

            {/* Preview rows */}
            <ScrollView
              className="bg-gray-50 rounded-lg p-2"
              style={{ maxHeight: 240 }}
            >
              {/* Header */}
              <View className="flex-row py-1 border-b border-gray-300">
                <Text className="text-xs font-medium text-gray-500 w-6" />
                <Text className="text-xs font-medium text-gray-500 w-24">
                  日付
                </Text>
                <Text className="text-xs font-medium text-gray-500 w-14">
                  時刻
                </Text>
                <Text className="text-xs font-medium text-gray-500 w-14">
                  数量
                </Text>
                <Text className="text-xs font-medium text-gray-500 flex-1">
                  メモ
                </Text>
              </View>
              {parsedRows.map((row, i) => {
                const errors = validationResults[i] ?? [];
                const hasError = errors.length > 0;
                return (
                  <View
                    key={`${i}-${row.date}-${row.quantity}`}
                    className={`py-1 border-b border-gray-200 ${hasError ? "bg-red-50" : ""}`}
                  >
                    <View className="flex-row items-center">
                      <View className="w-6 items-center">
                        {hasError ? (
                          <AlertCircle size={12} color="#ef4444" />
                        ) : (
                          <CheckCircle size={12} color="#22c55e" />
                        )}
                      </View>
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
                    {hasError && (
                      <Text className="text-xs text-red-500 ml-6 mt-0.5">
                        {errors.join(", ")}
                      </Text>
                    )}
                  </View>
                );
              })}
            </ScrollView>

            {errorCount > 0 && (
              <Text className="text-xs text-gray-500">
                エラーのある行はスキップされます
              </Text>
            )}

            <TouchableOpacity
              className={`py-3 rounded-xl items-center ${isImporting || !selectedActivityId || validCount === 0 ? "bg-gray-400" : "bg-gray-900"}`}
              onPress={handleImport}
              disabled={isImporting || !selectedActivityId || validCount === 0}
            >
              <Text className="text-white font-bold text-base">
                {isImporting
                  ? "インポート中..."
                  : `インポート (${validCount}件)`}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="py-2 items-center"
              onPress={() => {
                setStep("file");
                setParsedRows([]);
                setFileName(null);
              }}
            >
              <Text className="text-sm text-gray-500">ファイルを選び直す</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </ModalOverlay>
  );
}

// --- Helpers ---

function StepIndicator({ current }: { current: Step }) {
  const steps: Array<{ key: Step; label: string }> = [
    { key: "file", label: "ファイル選択" },
    { key: "preview", label: "プレビュー" },
  ];
  return (
    <View className="flex-row items-center justify-center gap-2">
      {steps.map((s, i) => (
        <View key={s.key} className="flex-row items-center">
          {i > 0 && <View className="w-6 h-px bg-gray-300 mx-1" />}
          <View
            className={`px-3 py-1 rounded-full ${current === s.key ? "bg-blue-100" : "bg-gray-100"}`}
          >
            <Text
              className={`text-xs font-medium ${current === s.key ? "text-blue-700" : "text-gray-400"}`}
            >
              {i + 1}. {s.label}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
}

import { useState } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import * as DocumentPicker from "expo-document-picker";
import { readAsStringAsync, EncodingType } from "expo-file-system/legacy";
import { FileText, Upload } from "lucide-react-native";
import { parseCSVText } from "@packages/domain/csv/csvParser";
import { ModalOverlay } from "../common/ModalOverlay";
import { useActivities } from "../../hooks/useActivities";
import { activityLogRepository } from "../../repositories/activityLogRepository";
import { syncEngine } from "../../sync/syncEngine";
import dayjs from "dayjs";

type CSVImportModalProps = { visible: boolean; onClose: () => void };
type ParsedRow = { date: string; time: string; quantity: string; memo: string };
type Step = "file" | "preview";

export function CSVImportModal({ visible, onClose }: CSVImportModalProps) {
  const { activities } = useActivities();
  const [step, setStep] = useState<Step>("file");
  const [selectedActivityId, setSelectedActivityId] = useState<string | null>(null);
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [progress, setProgress] = useState({ processed: 0, total: 0, succeeded: 0, failed: 0 });
  const [error, setError] = useState<string | null>(null);
  const [successCount, setSuccessCount] = useState<number | null>(null);

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

      // Map parsed records to rows using header-based lookup
      const rows: ParsedRow[] = csvResult.data.map((record) => {
        // Auto-detect columns by header name
        const dateCol = findColumn(csvResult.headers, ["date", "日付"]);
        const timeCol = findColumn(csvResult.headers, ["time", "時刻"]);
        const quantityCol = findColumn(csvResult.headers, ["quantity", "数量", "回数", "時間", "count", "cnt"]);
        const memoCol = findColumn(csvResult.headers, ["memo", "メモ", "備考"]);

        return {
          date: (dateCol ? record[dateCol] : record[csvResult.headers[0]]) || dayjs().format("YYYY-MM-DD"),
          time: (timeCol ? record[timeCol] : record[csvResult.headers[1]]) || "",
          quantity: (quantityCol ? record[quantityCol] : record[csvResult.headers[2]]) || "",
          memo: (memoCol ? record[memoCol] : record[csvResult.headers[3]]) || "",
        };
      });

      setParsedRows(rows);
      setStep("preview");
    } catch {
      setError("ファイルの読み込みに失敗しました");
    } finally {
      setIsParsing(false);
    }
  };

  const handleImport = async () => {
    if (!selectedActivityId) { setError("アクティビティを選択してください"); return; }
    if (parsedRows.length === 0) { setError("インポートするデータがありません"); return; }
    setIsImporting(true);
    setError(null);
    setProgress({ processed: 0, total: parsedRows.length, succeeded: 0, failed: 0 });

    let succeeded = 0;
    let failed = 0;

    try {
      for (let i = 0; i < parsedRows.length; i++) {
        const row = parsedRows[i];
        try {
          // Validate quantity
          const quantity = row.quantity ? Number(row.quantity) : null;
          if (quantity !== null && !Number.isFinite(quantity)) {
            failed++;
            setProgress({ processed: i + 1, total: parsedRows.length, succeeded, failed });
            continue;
          }

          // Format date (handle ISO datetime format)
          const date = row.date.includes("T") ? row.date.split("T")[0] : row.date;

          await activityLogRepository.createActivityLog({
            activityId: selectedActivityId,
            activityKindId: null,
            quantity,
            memo: row.memo,
            date,
            time: row.time || null,
          });
          succeeded++;
        } catch {
          failed++;
        }
        setProgress({ processed: i + 1, total: parsedRows.length, succeeded, failed });
      }

      // Trigger sync after import
      syncEngine.syncAll();

      if (failed === 0) {
        setSuccessCount(succeeded);
      } else {
        setSuccessCount(succeeded);
        setError(`${failed}件のインポートに失敗しました`);
      }
    } catch {
      setError("インポートに失敗しました");
    } finally {
      setIsImporting(false);
    }
  };

  const handleClose = () => { if (!isImporting) { resetForm(); onClose(); } };

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
                  selectedActivityId === a.id ? "bg-amber-500 border-amber-500" : "bg-white border-gray-300"
                }`}
              >
                <Text className={`text-sm ${selectedActivityId === a.id ? "text-white font-medium" : "text-gray-700"}`}>
                  {a.emoji} {a.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* File step */}
        {step === "file" && (
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
        )}

        {error && (
          <View className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <Text className="text-sm text-red-700">{error}</Text>
          </View>
        )}
        {successCount !== null && (
          <View className="p-3 bg-green-50 border border-green-200 rounded-lg">
            <Text className="text-sm text-green-700">{successCount}件のログをインポートしました</Text>
          </View>
        )}
        {isImporting && progress.total > 0 && (
          <View className="gap-1">
            <View className="w-full bg-gray-200 rounded-full h-2">
              <View className="bg-blue-600 h-2 rounded-full" style={{ width: `${(progress.processed / progress.total) * 100}%` }} />
            </View>
            <Text className="text-xs text-center text-gray-600">{progress.succeeded} / {progress.total} 件処理中...</Text>
          </View>
        )}

        {/* Preview step */}
        {step === "preview" && parsedRows.length > 0 && !successCount && (
          <View className="gap-3">
            <Text className="text-sm text-gray-500">プレビュー（先頭5件 / 全{parsedRows.length}件）</Text>
            <View className="bg-gray-50 rounded-lg p-2">
              {parsedRows.slice(0, 5).map((row, i) => (
                <View key={`row-${i}`} className="flex-row py-1 border-b border-gray-200">
                  <Text className="text-xs text-gray-600 w-24">{row.date}</Text>
                  <Text className="text-xs text-gray-600 w-14">{row.time}</Text>
                  <Text className="text-xs text-gray-600 w-14">{row.quantity}</Text>
                  <Text className="text-xs text-gray-600 flex-1" numberOfLines={1}>{row.memo}</Text>
                </View>
              ))}
            </View>
            <TouchableOpacity
              className={`py-3 rounded-xl items-center ${isImporting || !selectedActivityId ? "bg-gray-400" : "bg-gray-900"}`}
              onPress={handleImport}
              disabled={isImporting || !selectedActivityId}
            >
              <Text className="text-white font-bold text-base">
                {isImporting ? "インポート中..." : `インポート (${parsedRows.length}件)`}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity className="py-2 items-center" onPress={() => { setStep("file"); setParsedRows([]); setFileName(null); }}>
              <Text className="text-sm text-gray-500">ファイルを選び直す</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </ModalOverlay>
  );
}

// --- Helpers ---

function findColumn(headers: string[], keywords: string[]): string | undefined {
  return headers.find((h) => {
    const lower = h.toLowerCase();
    return keywords.some((kw) => lower.includes(kw));
  });
}

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
          <View className={`px-3 py-1 rounded-full ${current === s.key ? "bg-blue-100" : "bg-gray-100"}`}>
            <Text className={`text-xs font-medium ${current === s.key ? "text-blue-700" : "text-gray-400"}`}>
              {i + 1}. {s.label}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
}

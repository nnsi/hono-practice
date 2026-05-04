import { useMemo, useState } from "react";

import { useTranslation } from "@packages/i18n";
import { Download, FileText, Upload } from "lucide-react-native";
import { Platform, Text, TouchableOpacity, View } from "react-native";

import { useActivities } from "../../hooks/useActivities";
import { mobileTestIds } from "../../testing/testIds";
import { ModalOverlay } from "../common/ModalOverlay";
import { CSVImportStepIndicator } from "./CSVImportStepIndicator";
import { CSVPreviewSection } from "./CSVPreviewSection";
import { type CSVImportStep, shouldShowCSVPreview } from "./csvImportViewState";
import { runCSVImport } from "./useCSVImport";
import {
  downloadTemplateWeb,
  pickAndParseCSV,
  validateRow,
} from "./useCSVParse";

type CSVImportModalProps = { visible: boolean; onClose: () => void };
type ParsedRow = { date: string; time: string; quantity: string; memo: string };

export function CSVImportModal({ visible, onClose }: CSVImportModalProps) {
  const { t } = useTranslation("csv");
  const { activities } = useActivities();
  const [step, setStep] = useState<CSVImportStep>("file");
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

  const handlePickAndParse = () =>
    pickAndParseCSV(setFileName, setError, setIsParsing, (rows) => {
      setParsedRows(rows);
      setStep("preview");
    });

  const handleImport = () =>
    runCSVImport(
      selectedActivityId,
      parsedRows,
      validationResults,
      setIsImporting,
      setError,
      setProgress,
      setSuccessCount,
    );

  const handleClose = () => {
    if (!isImporting) {
      setStep("file");
      setSelectedActivityId(null);
      setParsedRows([]);
      setFileName(null);
      setIsParsing(false);
      setIsImporting(false);
      setProgress({ processed: 0, total: 0, succeeded: 0, failed: 0 });
      setError(null);
      setSuccessCount(null);
      onClose();
    }
  };

  return (
    <ModalOverlay
      visible={visible}
      onClose={handleClose}
      title={t("importModal")}
      testID={mobileTestIds.csvImport.dialog}
    >
      <View className="gap-4 pb-4">
        <CSVImportStepIndicator current={step} />

        {/* Activity picker */}
        <View>
          <Text className="text-sm text-gray-500 dark:text-gray-400 mb-1">
            {t("activityLabel")}
          </Text>
          <View className="flex-row flex-wrap gap-2">
            {activities.map((a) => (
              <TouchableOpacity
                key={a.id}
                onPress={() => setSelectedActivityId(a.id)}
                className={`px-3 py-1.5 rounded-full border ${
                  selectedActivityId === a.id
                    ? "bg-amber-50 dark:bg-amber-900/200 border-amber-500"
                    : "bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600"
                }`}
                accessibilityRole="button"
                accessibilityLabel={a.name}
                accessibilityState={{ selected: selectedActivityId === a.id }}
                testID={mobileTestIds.csvImport.activityOption(a.id)}
              >
                <Text
                  className={`text-sm ${selectedActivityId === a.id ? "text-white font-medium" : "text-gray-700 dark:text-gray-300"}`}
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
              className="py-6 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl items-center"
              onPress={handlePickAndParse}
              disabled={isParsing}
              accessibilityRole="button"
              accessibilityLabel={
                isParsing ? t("parsing") : t("selectFileAndParse")
              }
              testID={mobileTestIds.csvImport.pickFileButton}
            >
              <Upload size={28} color="#9ca3af" />
              <Text className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                {isParsing ? t("parsing") : t("selectFileAndParse")}
              </Text>
              {fileName && (
                <View className="flex-row items-center mt-1">
                  <FileText size={12} color="#6b7280" />
                  <Text className="text-xs text-gray-400 dark:text-gray-500 ml-1">
                    {fileName}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
            {Platform.OS === "web" && (
              <TouchableOpacity
                className="flex-row items-center justify-center gap-2 py-2 border border-gray-300 dark:border-gray-600 rounded-lg"
                onPress={downloadTemplateWeb}
                accessibilityRole="button"
                accessibilityLabel={t("downloadTemplate")}
                testID={mobileTestIds.csvImport.downloadTemplateButton}
              >
                <Download size={14} color="#6b7280" />
                <Text className="text-sm text-gray-600 dark:text-gray-400">
                  {t("downloadTemplate")}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {error && (
          <View className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <Text className="text-sm text-red-700 dark:text-red-400">
              {error}
            </Text>
          </View>
        )}
        {successCount !== null && (
          <View className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
            <Text className="text-sm text-green-700 dark:text-green-400">
              {t("importSuccessCount", { count: successCount })}
            </Text>
          </View>
        )}
        {isImporting && progress.total > 0 && (
          <View className="gap-1">
            <View className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <View
                className="bg-blue-600 h-2 rounded-full"
                style={{
                  width: `${(progress.processed / progress.total) * 100}%`,
                }}
              />
            </View>
            <Text className="text-xs text-center text-gray-600 dark:text-gray-400">
              {t("processingProgress", {
                processed: progress.processed,
                total: progress.total,
              })}
            </Text>
          </View>
        )}

        {/* Preview step */}
        {shouldShowCSVPreview(step, parsedRows.length, successCount) && (
          <CSVPreviewSection
            parsedRows={parsedRows}
            validationResults={validationResults}
            validCount={validCount}
            errorCount={errorCount}
            isImporting={isImporting}
            selectedActivityId={selectedActivityId}
            onImport={handleImport}
            onBack={() => {
              setStep("file");
              setParsedRows([]);
              setFileName(null);
            }}
          />
        )}
      </View>
    </ModalOverlay>
  );
}

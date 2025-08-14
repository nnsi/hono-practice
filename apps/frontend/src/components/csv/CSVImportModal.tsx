import { useCallback, useState } from "react";

import { Alert, AlertDescription } from "@frontend/components/ui/alert";
import { Button } from "@frontend/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@frontend/components/ui/dialog";
import { Progress } from "@frontend/components/ui/progress";
import { useActivityLogImport } from "@frontend/hooks/feature/csv/useActivityLogImport";
import { useActivityLogValidator } from "@frontend/hooks/feature/csv/useActivityLogValidator";
import { useCSVParser } from "@frontend/hooks/feature/csv/useCSVParser";
import { Download, FileText, Upload } from "lucide-react";

import { CSVColumnMapper } from "./CSVColumnMapper";
import { CSVImportPreview } from "./CSVImportPreview";

import type { ColumnMapping } from "./CSVColumnMapper";
import type { ValidatedActivityLog } from "@frontend/hooks/feature/csv/useActivityLogValidator";

type Props = {
  isOpen: boolean;
  onClose: () => void;
};

const CSVImportModal = ({ isOpen, onClose }: Props) => {
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<Record<string, string>[]>([]);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({});
  const [showMappingStep, setShowMappingStep] = useState(false);
  const [validatedLogs, setValidatedLogs] = useState<ValidatedActivityLog[]>(
    [],
  );
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState(false);

  const { parseFile, isLoading: isParsing, error: parseError } = useCSVParser();
  const { validateMapping, validateAllWithMapping, validateRowWithMapping } =
    useActivityLogValidator();
  const { importLogs, progress, isImporting, resetProgress } =
    useActivityLogImport();

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFile = e.target.files?.[0];
      if (selectedFile) {
        setFile(selectedFile);
        setImportError(null);
        setImportSuccess(false);
        resetProgress();
      }
    },
    [resetProgress],
  );

  const handleParse = useCallback(async () => {
    if (!file) return;

    try {
      const result = await parseFile(file);
      const headers = result.meta.fields || [];

      setParsedData(result.data);
      setCsvHeaders(headers);
      setShowMappingStep(true);
      setImportError(null);
    } catch (error) {
      setImportError(
        error instanceof Error ? error.message : "ファイルの解析に失敗しました",
      );
    }
  }, [file, parseFile]);

  const handleMappingConfirm = useCallback(() => {
    // マッピング検証
    const mappingErrors = validateMapping(columnMapping);
    if (mappingErrors.length > 0) {
      setImportError(mappingErrors.join("\n"));
      return;
    }

    // データ検証
    const validation = validateAllWithMapping(parsedData, columnMapping);
    setValidatedLogs(validation.validatedLogs);
    setShowMappingStep(false);

    if (validation.totalErrors > 0) {
      setImportError(
        `${validation.totalErrors}件のエラーが見つかりました。修正してからインポートしてください。`,
      );
    }
  }, [parsedData, columnMapping, validateMapping, validateAllWithMapping]);

  const handleEdit = useCallback(
    (index: number, field: keyof ValidatedActivityLog, value: string) => {
      setValidatedLogs((prev) => {
        const updated = [...prev];
        const log = { ...updated[index] };

        // 型安全なフィールド更新
        switch (field) {
          case "quantity":
            log[field] = Number(value) || 0;
            break;
          case "date":
          case "activityName":
          case "kindName":
          case "memo":
            log[field] = value;
            break;
          // 読み取り専用フィールドは更新しない
          case "activityId":
          case "isNewActivity":
          case "errors":
            return prev; // 変更しない
        }

        // アクティビティが変更された場合、種別をクリア
        if (field === "activityName") {
          log.kindName = "";
        }

        // 編集後の再検証（マッピング情報を使って逆変換）
        const rowData: Record<string, string> = {};
        if (columnMapping.date) rowData[columnMapping.date] = log.date;
        if (columnMapping.activity)
          rowData[columnMapping.activity] = log.activityName;
        if (columnMapping.kind && log.kindName)
          rowData[columnMapping.kind] = log.kindName;
        if (columnMapping.quantity)
          rowData[columnMapping.quantity] = log.quantity.toString();
        if (columnMapping.memo && log.memo)
          rowData[columnMapping.memo] = log.memo;

        const revalidated = validateRowWithMapping(rowData, columnMapping);
        updated[index] = revalidated;

        // エラー数を更新してメッセージを表示
        const totalErrors = updated.filter(
          (log) => log.errors.length > 0,
        ).length;
        if (totalErrors > 0) {
          setImportError(
            `${totalErrors}件のエラーがあります。修正してからインポートしてください。`,
          );
        } else {
          setImportError(null);
        }

        return updated;
      });
    },
    [columnMapping, validateRowWithMapping],
  );

  const handleRemove = useCallback((indices: number[]) => {
    setValidatedLogs((prev) => prev.filter((_, i) => !indices.includes(i)));
  }, []);

  const handleImport = useCallback(
    async (logs: ValidatedActivityLog[]) => {
      try {
        setImportError(null);
        const result = await importLogs(logs);

        if (result.success) {
          setImportSuccess(true);
          setTimeout(() => {
            onClose();
            setFile(null);
            setValidatedLogs([]);
            setImportSuccess(false);
          }, 2000);
        } else {
          setImportError(
            `インポート中にエラーが発生しました。${result.summary.failed}件が失敗しました。`,
          );
        }
      } catch (error) {
        setImportError(
          error instanceof Error ? error.message : "インポートに失敗しました",
        );
      }
    },
    [importLogs, onClose],
  );

  const downloadTemplate = useCallback(() => {
    const template =
      "date,activity,kind,quantity,memo\n2024-01-01,ランニング,ジョギング,5,朝ラン\n2024-01-02,読書,技術書,60,TypeScript本";
    const blob = new Blob([template], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "activity_log_template.csv";
    link.click();
    URL.revokeObjectURL(url);
  }, []);

  const handleClose = useCallback(() => {
    if (!isImporting) {
      onClose();
      setFile(null);
      setParsedData([]);
      setCsvHeaders([]);
      setColumnMapping({});
      setShowMappingStep(false);
      setValidatedLogs([]);
      setImportError(null);
      setImportSuccess(false);
      resetProgress();
    }
  }, [isImporting, onClose, resetProgress]);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>CSVインポート</DialogTitle>
          <DialogDescription>
            活動記録をCSVファイルから一括でインポートします
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4">
          {/* ファイル選択エリア */}
          {!showMappingStep && validatedLogs.length === 0 && (
            <div className="space-y-4">
              <div className="border-2 border-dashed rounded-lg p-8 text-center">
                <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <label htmlFor="csv-file" className="cursor-pointer">
                  <span className="text-primary hover:underline">
                    CSVファイルを選択
                  </span>
                  <input
                    id="csv-file"
                    type="file"
                    accept=".csv"
                    onChange={handleFileChange}
                    className="hidden"
                    disabled={isParsing || isImporting}
                  />
                </label>
                <p className="text-sm text-gray-500 mt-2">
                  またはファイルをドラッグ&ドロップ
                </p>
              </div>

              {file && (
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    <span className="text-sm">{file.name}</span>
                  </div>
                  <Button onClick={handleParse} disabled={isParsing}>
                    {isParsing ? "解析中..." : "ファイルを解析"}
                  </Button>
                </div>
              )}

              <Button
                variant="outline"
                onClick={downloadTemplate}
                className="w-full"
              >
                <Download className="h-4 w-4 mr-2" />
                CSVテンプレートをダウンロード
              </Button>
            </div>
          )}

          {/* エラー表示 */}
          {(parseError || importError) && (
            <Alert variant="destructive">
              <AlertDescription>{parseError || importError}</AlertDescription>
            </Alert>
          )}

          {/* 成功メッセージ */}
          {importSuccess && (
            <Alert className="bg-green-50 border-green-200">
              <AlertDescription className="text-green-800">
                インポートが完了しました！
              </AlertDescription>
            </Alert>
          )}

          {/* インポート進捗 */}
          {isImporting && progress.total > 0 && (
            <div className="space-y-2">
              <Progress value={(progress.processed / progress.total) * 100} />
              <p className="text-sm text-center">
                {progress.processed} / {progress.total} 件処理中...
              </p>
            </div>
          )}

          {/* カラムマッピング */}
          {showMappingStep && (
            <CSVColumnMapper
              csvHeaders={csvHeaders}
              csvSampleData={parsedData.slice(0, 3)}
              mapping={columnMapping}
              onMappingChange={setColumnMapping}
              onConfirm={handleMappingConfirm}
            />
          )}

          {/* プレビューテーブル */}
          {!showMappingStep && validatedLogs.length > 0 && (
            <CSVImportPreview
              validatedLogs={validatedLogs}
              onEdit={handleEdit}
              onRemove={handleRemove}
              onImport={handleImport}
              isImporting={isImporting}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export { CSVImportModal };

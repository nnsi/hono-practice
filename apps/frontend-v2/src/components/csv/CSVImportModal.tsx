import { useCSVImport } from "../../hooks/useCSVImport";
import { ModalOverlay } from "../common/ModalOverlay";
import { CSVColumnMapper } from "./CSVColumnMapper";
import { CSVImportPreview } from "./CSVImportPreview";
import { Download, FileText, Upload, X } from "lucide-react";

type Props = {
  onClose: () => void;
};

export function CSVImportModal({ onClose }: Props) {
  const csv = useCSVImport(onClose);

  return (
    <ModalOverlay onClose={csv.isImporting ? () => {} : onClose} centered>
      <div className="bg-white w-full max-w-4xl max-h-[90vh] rounded-xl shadow-xl flex flex-col mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b shrink-0">
          <div>
            <h2 className="text-base font-semibold">CSVインポート</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              活動記録をCSVファイルから一括でインポートします
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={csv.isImporting}
            className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 disabled:opacity-40"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* File selection step */}
          {csv.step === "file" && (
            <div className="space-y-4">
              <div className="border-2 border-dashed rounded-lg p-8 text-center">
                <Upload className="mx-auto h-10 w-10 text-gray-400 mb-3" />
                <label htmlFor="csv-file-v2" className="cursor-pointer">
                  <span className="text-blue-600 hover:underline text-sm">
                    CSVファイルを選択
                  </span>
                  <input
                    id="csv-file-v2"
                    type="file"
                    accept=".csv"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) csv.handleFileSelect(f);
                    }}
                    className="hidden"
                    disabled={csv.isParsing || csv.isImporting}
                  />
                </label>
                <p className="text-xs text-gray-400 mt-2">
                  .csvファイルに対応
                </p>
              </div>

              {csv.file && (
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-gray-500" />
                    <span className="text-sm">{csv.file.name}</span>
                  </div>
                  <button
                    type="button"
                    onClick={csv.handleParse}
                    disabled={csv.isParsing}
                    className="px-4 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300"
                  >
                    {csv.isParsing ? "解析中..." : "ファイルを解析"}
                  </button>
                </div>
              )}

              <button
                type="button"
                onClick={csv.downloadTemplate}
                className="flex items-center justify-center gap-2 w-full px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                <Download className="h-4 w-4" />
                CSVテンプレートをダウンロード
              </button>
            </div>
          )}

          {/* Error */}
          {csv.error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-700 whitespace-pre-line">
                {csv.error}
              </p>
            </div>
          )}

          {/* Success */}
          {csv.importSuccess && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-700">
                インポートが完了しました！
              </p>
            </div>
          )}

          {/* Progress */}
          {csv.isImporting && csv.progress.total > 0 && (
            <div className="space-y-2">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all"
                  style={{
                    width: `${(csv.progress.processed / csv.progress.total) * 100}%`,
                  }}
                />
              </div>
              <p className="text-xs text-center text-gray-600">
                {csv.progress.processed} / {csv.progress.total} 件処理中...
              </p>
            </div>
          )}

          {/* Column mapping step */}
          {csv.step === "mapping" && (
            <CSVColumnMapper
              csvHeaders={csv.csvHeaders}
              csvSampleData={csv.parsedData.slice(0, 3)}
              mapping={csv.columnMapping}
              onMappingChange={csv.setColumnMapping}
              onConfirm={csv.handleMappingConfirm}
            />
          )}

          {/* Preview step */}
          {csv.step === "preview" && csv.validatedLogs.length > 0 && (
            <CSVImportPreview
              validatedLogs={csv.validatedLogs}
              onEdit={csv.handleEdit}
              onRemove={csv.handleRemove}
              onImport={csv.handleImport}
              isImporting={csv.isImporting}
            />
          )}
        </div>
      </div>
    </ModalOverlay>
  );
}

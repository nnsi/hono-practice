import { useState } from "react";

import { Database, Download, RefreshCw, Trash2, Upload } from "lucide-react";

import { clearLocalData } from "../../sync/initialSync";
import { CSVExportModal } from "../csv/CSVExportModal";
import { CSVImportModal } from "../csv/CSVImportModal";

export function DataManagementSection() {
  const [showCSVImport, setShowCSVImport] = useState(false);
  const [showCSVExport, setShowCSVExport] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showFullResetConfirm, setShowFullResetConfirm] = useState(false);

  const handleClearData = async () => {
    await clearLocalData();
    window.location.reload();
  };

  const handleFullReset = async () => {
    const regs = await navigator.serviceWorker?.getRegistrations();
    await Promise.all(regs?.map((r) => r.unregister()) ?? []);
    const keys = await caches.keys();
    await Promise.all(keys.map((k) => caches.delete(k)));
    await clearLocalData();
    window.location.reload();
  };

  return (
    <>
      <section>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-1.5">
          <Database size={14} />
          データ管理
        </h2>
        <div className="rounded-xl border border-gray-200 p-4 space-y-4">
          <button
            type="button"
            onClick={() => setShowCSVImport(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors"
          >
            <Upload size={16} />
            CSVから活動記録をインポート
          </button>
          <button
            type="button"
            onClick={() => setShowCSVExport(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors"
          >
            <Download size={16} />
            活動記録をCSVにエクスポート
          </button>
          <div className="border-t border-gray-100" />
          <p className="text-sm text-gray-600 leading-relaxed">
            アクティビティや記録データはブラウザのローカルストレージ（IndexedDB）に保存されています。サーバーとの同期によりデータは復元可能です。
          </p>
          {!showClearConfirm ? (
            <button
              type="button"
              onClick={() => setShowClearConfirm(true)}
              className="flex items-center gap-2 px-4 py-2 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
            >
              <Trash2 size={16} />
              ローカルデータを削除
            </button>
          ) : (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 space-y-3">
              <p className="text-sm text-red-700 font-medium">
                ローカルに保存されたデータをすべて削除します。次回アクセス時にサーバーから再同期されます。本当に削除しますか？
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleClearData}
                  className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  削除する
                </button>
                <button
                  type="button"
                  onClick={() => setShowClearConfirm(false)}
                  className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  キャンセル
                </button>
              </div>
            </div>
          )}
          <div className="border-t border-gray-100" />
          {!showFullResetConfirm ? (
            <button
              type="button"
              onClick={() => setShowFullResetConfirm(true)}
              className="flex items-center gap-2 px-4 py-2 text-sm text-orange-600 border border-orange-200 rounded-lg hover:bg-orange-50 transition-colors"
            >
              <RefreshCw size={16} />
              アプリを完全に初期化
            </button>
          ) : (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 space-y-3">
              <p className="text-sm text-orange-700 font-medium">
                ローカルデータに加え、キャッシュとService
                Workerもすべて削除します。同期やアプリの動作に問題がある場合に使用してください。
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleFullReset}
                  className="px-4 py-2 text-sm bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
                >
                  初期化する
                </button>
                <button
                  type="button"
                  onClick={() => setShowFullResetConfirm(false)}
                  className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  キャンセル
                </button>
              </div>
            </div>
          )}
        </div>
      </section>

      {showCSVImport && (
        <CSVImportModal onClose={() => setShowCSVImport(false)} />
      )}
      {showCSVExport && (
        <CSVExportModal onClose={() => setShowCSVExport(false)} />
      )}
    </>
  );
}

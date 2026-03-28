import { useState } from "react";

import { useTranslation } from "@packages/i18n";
import { Database, Download, RefreshCw, Trash2, Upload } from "lucide-react";

import { clearLocalData } from "../../sync/initialSync";
import { CSVExportModal } from "../csv/CSVExportModal";
import { CSVImportModal } from "../csv/CSVImportModal";

export function DataManagementSection() {
  const { t } = useTranslation("settings");
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
          {t("dataManagement")}
        </h2>
        <div className="rounded-xl border border-gray-200 p-4 space-y-4">
          <button
            type="button"
            onClick={() => setShowCSVImport(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors"
          >
            <Upload size={16} />
            {t("importCSV")}
          </button>
          <button
            type="button"
            onClick={() => setShowCSVExport(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors"
          >
            <Download size={16} />
            {t("exportCSV")}
          </button>
          <div className="border-t border-gray-100" />
          <p className="text-sm text-gray-600 leading-relaxed">
            {t("localStorageNote")}
          </p>
          {!showClearConfirm ? (
            <button
              type="button"
              onClick={() => setShowClearConfirm(true)}
              className="flex items-center gap-2 px-4 py-2 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
            >
              <Trash2 size={16} />
              {t("deleteLocalData")}
            </button>
          ) : (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 space-y-3">
              <p className="text-sm text-red-700 font-medium">
                {t("deleteLocalDataConfirm")}
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleClearData}
                  className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  {t("deleteLocalDataButton")}
                </button>
                <button
                  type="button"
                  onClick={() => setShowClearConfirm(false)}
                  className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  {t("cancel")}
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
              {t("fullReset")}
            </button>
          ) : (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 space-y-3">
              <p className="text-sm text-orange-700 font-medium">
                {t("fullResetMessage")}
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleFullReset}
                  className="px-4 py-2 text-sm bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
                >
                  {t("fullResetButton")}
                </button>
                <button
                  type="button"
                  onClick={() => setShowFullResetConfirm(false)}
                  className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  {t("cancel")}
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

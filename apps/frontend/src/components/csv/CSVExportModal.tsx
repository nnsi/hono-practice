import { useTranslation } from "@packages/i18n";
import { CheckCircle, Download, X } from "lucide-react";

import { useCSVExport } from "../../hooks/useCSVExport";
import { DatePickerField } from "../common/DatePickerField";
import { ModalOverlay } from "../common/ModalOverlay";

type Props = {
  onClose: () => void;
};

export function CSVExportModal({ onClose }: Props) {
  const csv = useCSVExport();
  const { t } = useTranslation("csv");

  return (
    <ModalOverlay onClose={csv.isExporting ? () => {} : onClose}>
      <div className="bg-white w-full max-w-md max-h-[90vh] rounded-2xl shadow-modal flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b shrink-0">
          <div>
            <h2 className="text-base font-semibold">{t("exportModal")}</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {t("exportDescription")}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={csv.isExporting}
            aria-label="閉じる"
            className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 disabled:opacity-40"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t("startDate")}
              </label>
              <DatePickerField
                value={csv.startDate}
                onChange={csv.setStartDate}
                placeholder={t("startDatePlaceholder")}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t("endDate")}
              </label>
              <DatePickerField
                value={csv.endDate}
                onChange={csv.setEndDate}
                placeholder={t("endDatePlaceholder")}
              />
            </div>
          </div>

          {csv.error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-700">{csv.error}</p>
            </div>
          )}

          {csv.result && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
              <CheckCircle size={16} className="text-green-600 shrink-0" />
              <p className="text-sm text-green-700">
                {csv.result.count}
                {t("exportCount")}
              </p>
            </div>
          )}

          <button
            type="button"
            onClick={csv.handleExport}
            disabled={csv.isExporting || !csv.startDate || !csv.endDate}
            className={`flex items-center justify-center gap-2 w-full px-4 py-2.5 text-sm font-medium rounded-lg text-white transition-colors ${
              csv.isExporting || !csv.startDate || !csv.endDate
                ? "bg-gray-300 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            <Download size={16} />
            {csv.isExporting ? t("exporting") : t("exportButton")}
          </button>

          <p className="text-xs text-gray-400 text-center">
            {t("exportFormat")}
          </p>
        </div>
      </div>
    </ModalOverlay>
  );
}

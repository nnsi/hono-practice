import { useTranslation } from "@packages/i18n";
import { X } from "lucide-react";

import type { DexieActivity } from "../../db/schema";
import { ModalOverlay } from "../common/ModalOverlay";
import { EditActivityKindsField } from "./EditActivityKindsField";
import { IconTypeSelector } from "./IconTypeSelector";
import { RecordingModeSelector } from "./RecordingModeSelector";
import { useEditActivityDialog } from "./useEditActivityDialog";

export function EditActivityDialog({
  activity,
  onClose,
  onUpdated,
}: {
  activity: DexieActivity;
  onClose: () => void;
  onUpdated: () => void;
}) {
  const { t } = useTranslation("actiko");
  const {
    name,
    setName,
    quantityUnit,
    setQuantityUnit,
    showCombinedStats,
    setShowCombinedStats,
    kinds,
    setKinds,
    icon,
    recordingMode,
    setRecordingMode,
    recordingModeConfig,
    setRecordingModeConfig,
    isSubmitting,
    showDeleteConfirm,
    setShowDeleteConfirm,
    handleIconChange,
    handleSubmit,
    handleDelete,
  } = useEditActivityDialog(activity, onUpdated, onClose);

  return (
    <ModalOverlay onClose={onClose}>
      <div className="bg-white w-full max-w-md rounded-2xl shadow-modal p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">{t("editTitle")}</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">
              {t("icon")}
            </label>
            <IconTypeSelector
              value={icon}
              onChange={handleIconChange}
              disabled={isSubmitting}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">
              {t("name")}
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">
              {t("unit")}
            </label>
            <input
              type="text"
              value={quantityUnit}
              onChange={(e) => setQuantityUnit(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder={t("unitPlaceholder")}
            />
          </div>

          <RecordingModeSelector
            recordingMode={recordingMode}
            onRecordingModeChange={setRecordingMode}
            recordingModeConfig={recordingModeConfig}
            onRecordingModeConfigChange={setRecordingModeConfig}
          />

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showCombinedStats}
              onChange={(e) => setShowCombinedStats(e.target.checked)}
              className="h-5 w-5 rounded accent-blue-600"
            />
            <span className="text-sm">{t("showCombinedStats")}</span>
          </label>

          <EditActivityKindsField kinds={kinds} setKinds={setKinds} />

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={isSubmitting || !name.trim()}
              className="flex-1 py-3 bg-black text-white rounded-lg font-medium hover:bg-gray-800 disabled:opacity-50 transition-colors"
            >
              {t("save")}
            </button>
            {!showDeleteConfirm ? (
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="px-4 py-3 border border-red-300 text-red-500 rounded-lg hover:bg-red-50 transition-colors text-sm"
              >
                {t("delete")}
              </button>
            ) : (
              <button
                type="button"
                onClick={handleDelete}
                disabled={isSubmitting}
                className="px-4 py-3 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 disabled:opacity-50 transition-colors text-sm"
              >
                {t("confirmDelete")}
              </button>
            )}
          </div>
        </form>
      </div>
    </ModalOverlay>
  );
}

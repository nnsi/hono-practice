import type { ActivityLogBase } from "@packages/frontend-shared/hooks/types";
import { useTranslation } from "@packages/i18n";
import { X } from "lucide-react";

import type { DexieActivity } from "../../db/schema";
import { FormButton } from "../common/FormButton";
import { FormInput } from "../common/FormInput";
import { FormTextarea } from "../common/FormTextarea";
import { ModalOverlay } from "../common/ModalOverlay";
import { renderActivityIcon } from "../goal/activityHelpers";
import { useEditLogDialog } from "./useEditLogDialog";

export function EditLogDialog({
  log,
  activity,
  onClose,
}: {
  log: ActivityLogBase;
  activity: DexieActivity | null;
  onClose: () => void;
}) {
  const { t } = useTranslation("activity");
  const {
    quantity,
    setQuantity,
    memo,
    setMemo,
    selectedKindId,
    setSelectedKindId,
    isSubmitting,
    showDeleteConfirm,
    setShowDeleteConfirm,
    kinds,
    handleSave,
    handleDelete,
  } = useEditLogDialog(log, onClose);

  return (
    <ModalOverlay onClose={onClose}>
      <div className="bg-white w-full max-w-md rounded-2xl shadow-modal p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold flex items-center gap-2">
            {renderActivityIcon(activity)}
            {activity?.name ?? t("log.unknownActivity")}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          {/* 種類選択 */}
          {kinds.length > 0 && (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-600">
                {t("log.kindLabel")}
              </label>
              <div className="flex flex-wrap gap-2">
                {kinds.map((kind) => (
                  <button
                    key={kind.id}
                    type="button"
                    onClick={() =>
                      setSelectedKindId(
                        selectedKindId === kind.id ? null : kind.id,
                      )
                    }
                    className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                      selectedKindId === kind.id
                        ? "bg-black text-white border-black"
                        : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    {kind.color && (
                      <span
                        className="inline-block w-2.5 h-2.5 rounded-full mr-1.5"
                        style={{ backgroundColor: kind.color }}
                      />
                    )}
                    {kind.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 数量入力 */}
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">
              {t("log.quantityLabel")}{" "}
              {activity?.quantityUnit && `(${activity.quantityUnit})`}
            </label>
            <FormInput
              type="number"
              inputMode="decimal"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              onFocus={(e) => e.target.select()}
              className="text-lg"
              min="0"
              step="any"
            />
          </div>

          {/* メモ */}
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">
              {t("log.memoLabel")}
            </label>
            <FormTextarea
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              rows={2}
              placeholder={t("log.memoPlaceholder")}
            />
          </div>

          {/* アクションボタン */}
          <div className="flex gap-2">
            {!showDeleteConfirm ? (
              <FormButton
                variant="danger"
                label={t("log.deleteButton")}
                onClick={() => setShowDeleteConfirm(true)}
                className="px-4"
              />
            ) : (
              <FormButton
                variant="dangerConfirm"
                label={t("log.deleteButton")}
                onClick={handleDelete}
                disabled={isSubmitting}
                className="px-4"
              />
            )}
            <FormButton
              type="submit"
              variant="primary"
              label={t("log.saveButton")}
              disabled={isSubmitting}
              className="flex-1"
            />
          </div>
        </form>
      </div>
    </ModalOverlay>
  );
}

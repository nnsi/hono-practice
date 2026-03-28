import { useTranslation } from "@packages/i18n";

import { ModalOverlay } from "../common/ModalOverlay";

export function DeleteConfirmDialog({
  taskTitle,
  onConfirm,
  onCancel,
}: {
  taskTitle: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const { t } = useTranslation("task");

  return (
    <ModalOverlay onClose={onCancel}>
      <div className="bg-white w-[90%] max-w-sm rounded-2xl shadow-modal p-5">
        <h2 className="text-lg font-bold mb-2">{t("delete.title")}</h2>
        <p className="text-sm text-gray-500 mb-4">
          {t("delete.description", { taskTitle })}
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-700 hover:bg-gray-50 transition-colors"
          >
            {t("delete.cancel")}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 py-2.5 bg-red-500 text-white rounded-xl text-sm font-medium hover:bg-red-600 transition-colors"
          >
            {t("delete.confirm")}
          </button>
        </div>
      </div>
    </ModalOverlay>
  );
}

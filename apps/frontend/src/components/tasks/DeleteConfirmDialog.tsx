import { useTranslation } from "@packages/i18n";

import { FormButton } from "../common/FormButton";
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
          <FormButton
            variant="secondary"
            label={t("delete.cancel")}
            onClick={onCancel}
            className="flex-1"
          />
          <FormButton
            variant="dangerConfirm"
            label={t("delete.confirm")}
            onClick={onConfirm}
            className="flex-1"
          />
        </div>
      </div>
    </ModalOverlay>
  );
}

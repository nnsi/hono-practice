import { useTranslation } from "@packages/i18n";

import { FormButton } from "../common/FormButton";
import { ModalOverlay } from "../common/ModalOverlay";

/**
 * task: 通常の Task 削除 / skipToday: 仮想タスク（行が無い）を「今日はやらない」 /
 * schedule: 繰り返し設定そのものの削除（完了済みの記録は残る）
 */
export type DeleteConfirmVariant = "task" | "skipToday" | "schedule";

const PREFIX: Record<
  DeleteConfirmVariant,
  "delete" | "delete.skipToday" | "delete.schedule"
> = {
  task: "delete",
  skipToday: "delete.skipToday",
  schedule: "delete.schedule",
};

export function DeleteConfirmDialog({
  taskTitle,
  variant = "task",
  onConfirm,
  onCancel,
}: {
  taskTitle: string;
  variant?: DeleteConfirmVariant;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const { t } = useTranslation("task");
  const prefix = PREFIX[variant];

  return (
    <ModalOverlay onClose={onCancel}>
      <div className="bg-white w-[90%] max-w-sm rounded-2xl shadow-modal p-5">
        <h2 className="text-lg font-bold mb-2">{t(`${prefix}.title`)}</h2>
        <p className="text-sm text-gray-500 mb-4">
          {t(`${prefix}.description`, { taskTitle })}
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
            label={t(`${prefix}.confirm`)}
            onClick={onConfirm}
            className="flex-1"
          />
        </div>
      </div>
    </ModalOverlay>
  );
}

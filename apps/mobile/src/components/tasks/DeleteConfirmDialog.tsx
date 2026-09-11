import { useTranslation } from "@packages/i18n";
import { Text, View } from "react-native";

import { mobileTestIds } from "../../testing/testIds";
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
    <ModalOverlay
      visible
      onClose={onCancel}
      title={t(`${prefix}.title`)}
      testID={mobileTestIds.tasks.deleteConfirmDialog}
      footer={
        <View className="flex-row gap-2">
          <FormButton
            variant="secondary"
            label={t("delete.cancel")}
            onPress={onCancel}
            className="flex-1"
          />
          <FormButton
            variant="dangerConfirm"
            label={t(`${prefix}.confirm`)}
            onPress={onConfirm}
            className="flex-1"
            testID={mobileTestIds.tasks.deleteConfirmButton}
          />
        </View>
      }
    >
      <Text className="text-sm text-gray-500 dark:text-gray-400">
        {t(`${prefix}.description`, { taskTitle })}
      </Text>
    </ModalOverlay>
  );
}

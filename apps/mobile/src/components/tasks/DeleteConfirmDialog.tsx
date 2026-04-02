import { useTranslation } from "@packages/i18n";
import { Text, View } from "react-native";

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
    <ModalOverlay
      visible
      onClose={onCancel}
      title={t("delete.title")}
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
            label={t("delete.confirm")}
            onPress={onConfirm}
            className="flex-1"
          />
        </View>
      }
    >
      <Text className="text-sm text-gray-500 dark:text-gray-400">
        この操作は取り消せません。タスク「{taskTitle}
        」を完全に削除します。
      </Text>
    </ModalOverlay>
  );
}

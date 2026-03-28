import { useTranslation } from "@packages/i18n";
import { Text, TouchableOpacity, View } from "react-native";

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
          <TouchableOpacity
            onPress={onCancel}
            className="flex-1 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl items-center"
          >
            <Text className="text-sm text-gray-700 dark:text-gray-300">
              {t("delete.cancel")}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={onConfirm}
            className="flex-1 py-2.5 bg-red-50 dark:bg-red-900/200 rounded-xl items-center"
          >
            <Text className="text-sm text-white font-medium">
              {t("delete.confirm")}
            </Text>
          </TouchableOpacity>
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

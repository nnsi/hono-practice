import { useTranslation } from "@packages/i18n";
import { Text, View } from "react-native";

import { FormButton } from "../common/FormButton";
import { ModalOverlay } from "../common/ModalOverlay";

export function NoteDeleteConfirmDialog({
  noteTitle,
  onConfirm,
  onCancel,
}: {
  noteTitle: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const { t } = useTranslation("note");

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
        {t("delete.description", { noteTitle })}
      </Text>
    </ModalOverlay>
  );
}

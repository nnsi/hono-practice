import { useTranslation } from "@packages/i18n";
import { View } from "react-native";

import { FormButton } from "../common/FormButton";

export function TaskEditDialogFooter({
  taskId,
  title,
  isSubmitting,
  onDelete,
  onClose,
  onSave,
}: {
  taskId: string;
  title: string;
  isSubmitting: boolean;
  onDelete: (id: string) => void;
  onClose: () => void;
  onSave: () => void;
}) {
  const { t } = useTranslation("task");
  return (
    <View className="flex-row gap-2">
      <FormButton
        variant="danger"
        label={t("edit.delete")}
        onPress={() => onDelete(taskId)}
        className="px-4"
      />
      <View className="flex-1" />
      <FormButton
        variant="secondary"
        label={t("delete.cancel")}
        onPress={onClose}
        className="px-4"
      />
      <FormButton
        variant="primary"
        label={isSubmitting ? t("edit.submitting") : t("edit.submit")}
        onPress={onSave}
        disabled={isSubmitting || !title.trim()}
        className="px-4"
      />
    </View>
  );
}

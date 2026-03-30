import { useTranslation } from "@packages/i18n";
import { Text, TouchableOpacity, View } from "react-native";

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
      <TouchableOpacity
        onPress={() => onDelete(taskId)}
        className="px-4 py-2.5 border border-red-300 rounded-lg items-center"
        accessibilityRole="button"
        accessibilityLabel={t("edit.delete")}
      >
        <Text className="text-sm text-red-600 dark:text-red-400">
          {t("edit.delete")}
        </Text>
      </TouchableOpacity>
      <View className="flex-1" />
      <TouchableOpacity
        onPress={onClose}
        className="px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg items-center"
        accessibilityRole="button"
        accessibilityLabel={t("delete.cancel")}
      >
        <Text className="text-sm text-gray-700 dark:text-gray-300">
          {t("delete.cancel")}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={onSave}
        disabled={isSubmitting || !title.trim()}
        className={`px-4 py-2.5 rounded-lg items-center ${
          isSubmitting || !title.trim() ? "bg-blue-300" : "bg-blue-600"
        }`}
        accessibilityRole="button"
        accessibilityLabel={
          isSubmitting ? t("edit.submitting") : t("edit.submit")
        }
      >
        <Text className="text-sm text-white font-medium">
          {isSubmitting ? t("edit.submitting") : t("edit.submit")}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

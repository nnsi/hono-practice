import { useTranslation } from "@packages/i18n";
import { ArrowLeft, FileX } from "lucide-react-native";
import { Text, TouchableOpacity, View } from "react-native";

import { FormButton } from "../common/FormButton";

export function NoteNotFound({
  onBack,
  topInset,
}: {
  onBack: () => void;
  topInset: number;
}) {
  const { t } = useTranslation("note");

  return (
    <View
      className="flex-1 bg-white dark:bg-gray-900"
      style={{ paddingTop: topInset }}
    >
      <View className="flex-row items-center px-2 h-12 border-b border-gray-100 dark:border-gray-800">
        <TouchableOpacity
          onPress={onBack}
          className="p-2"
          hitSlop={{ top: 3, bottom: 3, left: 3, right: 3 }}
          accessibilityRole="button"
          accessibilityLabel={t("detail.back")}
        >
          <ArrowLeft size={22} color="#6b7280" />
        </TouchableOpacity>
      </View>
      <View className="flex-1 items-center justify-center gap-3 px-8">
        <FileX size={48} color="#d1d5db" />
        <Text className="text-gray-900 dark:text-gray-100 font-semibold text-base">
          {t("detail.notFound")}
        </Text>
        <Text className="text-gray-500 dark:text-gray-400 text-sm text-center">
          {t("detail.notFoundDescription")}
        </Text>
      </View>
    </View>
  );
}

export function NoteDiscardConfirmInline({
  onConfirm,
  onCancel,
}: {
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const { t } = useTranslation("note");

  return (
    <View className="px-4 py-3 bg-amber-50 dark:bg-amber-900/30 border-b border-amber-200 dark:border-amber-700 flex-row items-center justify-between">
      <Text className="text-sm text-amber-800 dark:text-amber-200 font-medium">
        {t("detail.discardTitle")}
      </Text>
      <View className="flex-row gap-2">
        <FormButton
          variant="secondary"
          label={t("detail.keepEditing")}
          onPress={onCancel}
          className="px-3 py-1"
        />
        <FormButton
          variant="dangerConfirm"
          label={t("detail.discard")}
          onPress={onConfirm}
          className="px-3 py-1"
        />
      </View>
    </View>
  );
}

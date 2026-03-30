import { useTranslation } from "@packages/i18n";
import { Text, TouchableOpacity, View } from "react-native";

import { DatePickerField } from "../common/DatePickerField";

export function FreezePeriodForm({
  startDate,
  endDate,
  busy,
  onStartDateChange,
  onEndDateChange,
  onCancel,
  onConfirm,
}: {
  startDate: string;
  endDate: string | null;
  busy: boolean;
  onStartDateChange: (d: string) => void;
  onEndDateChange: (d: string | null) => void;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const { t } = useTranslation("goal");
  return (
    <View className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 rounded-xl px-4 py-3 mb-3">
      <DatePickerField
        value={startDate}
        onChange={onStartDateChange}
        label={t("freezeStartDateLabel")}
      />
      <View className="mt-2">
        <Text className="text-sm text-gray-500 dark:text-gray-400 mb-1">
          {t("freezeEndDateLabel")}
        </Text>
        {endDate ? (
          <View className="flex-row items-center">
            <DatePickerField value={endDate} onChange={onEndDateChange} />
            <TouchableOpacity
              onPress={() => onEndDateChange(null)}
              className="ml-2 px-2 py-1"
            >
              <Text className="text-xs text-gray-500 dark:text-gray-400">
                {t("freezeCancelButton")}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            onPress={() => onEndDateChange(startDate)}
            className="py-1"
          >
            <Text className="text-sm text-blue-600 dark:text-blue-400">
              {t("freezeEndDatePlaceholder")}
            </Text>
          </TouchableOpacity>
        )}
      </View>
      <View className="flex-row justify-end gap-2 mt-3">
        <TouchableOpacity
          onPress={onCancel}
          className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg"
        >
          <Text className="text-xs text-gray-600 dark:text-gray-400">
            {t("cancelButton")}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={onConfirm}
          disabled={busy}
          className="px-4 py-2 bg-blue-600 rounded-lg"
        >
          <Text className="text-xs font-medium text-white">
            {t("freezeConfirmButton")}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

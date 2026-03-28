import { formatQuantityWithUnit } from "@packages/frontend-shared/utils/statsFormatting";
import { useTranslation } from "@packages/i18n";
import { Text, View } from "react-native";

type SummarySectionProps = {
  summary: {
    totalQuantity: number;
    activeDays: number;
    daysInMonth: number;
    avgPerDay: number;
  };
  quantityUnit: string;
};

export function SummarySection({ summary, quantityUnit }: SummarySectionProps) {
  const { t } = useTranslation("stats");

  return (
    <View className="px-4 pb-3">
      <View className="flex-row gap-2">
        <View className="flex-1 bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700 items-center">
          <Text className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">
            {t("summaryTotal")}
          </Text>
          <Text className="text-xs font-bold text-gray-900 dark:text-gray-100">
            {formatQuantityWithUnit(summary.totalQuantity, quantityUnit)}
          </Text>
        </View>
        <View className="flex-1 bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700 items-center">
          <Text className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">
            {t("summaryDailyAverage")}
          </Text>
          <Text className="text-xs font-bold text-gray-900 dark:text-gray-100">
            {formatQuantityWithUnit(summary.avgPerDay, quantityUnit)}
          </Text>
        </View>
        <View className="flex-1 bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700 items-center">
          <Text className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">
            {t("summaryRecordedDays")}
          </Text>
          <Text className="text-sm font-bold text-gray-900 dark:text-gray-100">
            {summary.activeDays}
            <Text className="text-xs font-normal text-gray-400 dark:text-gray-500">
              /{summary.daysInMonth}
              {t("dateLabel")}
            </Text>
          </Text>
        </View>
      </View>
    </View>
  );
}

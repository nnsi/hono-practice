import { useTranslation } from "@packages/i18n";
import dayjs from "dayjs";
import { Pause, Play } from "lucide-react-native";
import { Text, TouchableOpacity, View } from "react-native";

import { mobileTestIdsExt } from "../../testing/testIdsExt";
import { FreezePeriodForm } from "./FreezePeriodForm";
import { FreezePeriodHistory } from "./FreezePeriodHistory";
import { useFreezePeriodManager } from "./useFreezePeriodManager";

export function FreezePeriodManager({ goalId }: { goalId: string }) {
  const { t } = useTranslation("goal");
  const {
    busy,
    showForm,
    setShowForm,
    deletingId,
    setDeletingId,
    today,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    rows,
    activePeriod,
    handleFreezeToday,
    handleFreezeWithDates,
    handleResume,
    handleDeleteConfirm,
    cancelForm,
  } = useFreezePeriodManager(goalId);

  return (
    <View className="mt-3 border-t border-gray-100 dark:border-gray-800 pt-3">
      <Text className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
        {t("freezePeriodLabel")}
      </Text>

      {activePeriod ? (
        <TouchableOpacity
          className="flex-row items-center gap-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl px-4 py-3 mb-3"
          onPress={handleResume}
          disabled={busy}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={t("resumeButton")}
          accessibilityState={{ disabled: busy }}
          testID={mobileTestIdsExt.goalFreeze.resumeButton}
        >
          <Play size={16} color="#16a34a" />
          <Text className="text-sm font-medium text-green-700 dark:text-green-400">
            {t("resumeButton")}
          </Text>
          <Text className="text-xs text-green-600 dark:text-green-400 ml-auto">
            {dayjs(activePeriod.startDate).format("M/D")}
            {t("dateRange")}
          </Text>
        </TouchableOpacity>
      ) : showForm ? (
        <FreezePeriodForm
          startDate={startDate}
          endDate={endDate}
          busy={busy}
          onStartDateChange={setStartDate}
          onEndDateChange={setEndDate}
          onCancel={cancelForm}
          onConfirm={handleFreezeWithDates}
        />
      ) : (
        <View className="flex-row gap-2 mb-3">
          <TouchableOpacity
            className="flex-1 flex-row items-center justify-center gap-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 rounded-xl px-4 py-3"
            onPress={handleFreezeToday}
            disabled={busy}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={t("freezeTodayButton")}
            accessibilityState={{ disabled: busy }}
            testID={mobileTestIdsExt.goalFreeze.todayButton}
          >
            <Pause size={16} color="#2563eb" />
            <Text className="text-sm font-medium text-blue-700">
              {t("freezeTodayButton")}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="flex-1 flex-row items-center justify-center gap-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3"
            onPress={() => setShowForm(true)}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={t("freezeByDateButton")}
            testID={mobileTestIdsExt.goalFreeze.byDateButton}
          >
            <Text className="text-sm font-medium text-gray-600 dark:text-gray-400">
              {t("freezeByDateButton")}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      <FreezePeriodHistory
        rows={rows}
        today={today}
        deletingId={deletingId}
        onDeleteRequest={setDeletingId}
        onDeleteConfirm={handleDeleteConfirm}
        onDeleteCancel={() => setDeletingId(null)}
      />
    </View>
  );
}

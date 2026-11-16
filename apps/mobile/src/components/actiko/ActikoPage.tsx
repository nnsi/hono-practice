import { useTranslation } from "@packages/i18n";
import { ArrowUpDown, Plus } from "lucide-react-native";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { usePullToRefresh } from "../../hooks/usePullToRefresh";
import { useReduceMotion } from "../../hooks/useReduceMotion";
import { activityLogRepository } from "../../repositories/activityLogRepository";
import { syncEngine } from "../../sync/syncEngine";
import { mobileTestIds } from "../../testing/testIds";
import { CalendarPopover } from "../common/CalendarPopover";
import { DailyTaskSection } from "../daily/DailyTaskSection";
import { EditLogDialog } from "../daily/EditLogDialog";
import { ActikoDialogs } from "./ActikoDialogs";
import { ActikoGridItem } from "./ActikoGridItem";
import { DateNavHeader } from "./DateNavHeader";
import { DayLogList } from "./DayLogList";
import { useActikoPage } from "./useActikoPage";

/** 記録グリッド・その日の記録・その日のタスクを 1 画面にまとめたページ */
export function ActikoPage() {
  const { t } = useTranslation("actiko");
  const { t: tActivity } = useTranslation("activity");
  const page = useActikoPage();
  const {
    date,
    setDate,
    goToPrev,
    goToNext,
    isToday,
    activitiesReady,
    gridActivities,
    iconBlobMap,
    summaryByActivity,
    logs,
    kindsMap,
    activitiesMap,
    selectedActivity,
    setSelectedActivity,
    createActivityOpen,
    setCreateActivityOpen,
    editActivity,
    setEditActivity,
    editingLog,
    setEditingLog,
    calendarOpen,
    setCalendarOpen,
    reorderOpen,
    setReorderOpen,
  } = page;

  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const effectiveWidth = Math.min(screenWidth, 768);
  // 記録一覧とタスクを同じ画面に置くため、グリッドは 3 列以上に詰める
  const numColumns = Math.min(5, Math.max(3, Math.floor(effectiveWidth / 120)));

  const reduceMotion = useReduceMotion();
  const { refreshing, onRefresh } = usePullToRefresh();

  const gridRows: (typeof gridActivities)[] = [];
  for (let i = 0; i < gridActivities.length; i += numColumns) {
    gridRows.push(gridActivities.slice(i, i + numColumns));
  }

  return (
    <View
      className="flex-1"
      collapsable={false}
      testID={mobileTestIds.actiko.screen}
    >
      <DateNavHeader
        date={date}
        isToday={isToday}
        onPrev={goToPrev}
        onNext={goToNext}
        onToggleCalendar={() => setCalendarOpen(!calendarOpen)}
      />

      {/* Calendar popover */}
      <CalendarPopover
        selectedDate={date}
        onDateSelect={setDate}
        isOpen={calendarOpen}
        onClose={() => setCalendarOpen(false)}
      />

      {!activitiesReady ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#3b82f6" />
        </View>
      ) : (
        <ScrollView
          keyboardShouldPersistTaps="handled"
          className="flex-1"
          contentContainerStyle={{ paddingBottom: 80 + insets.bottom }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {/* 記録グリッド: タップで記録、カードにその日の合計を出す */}
          {gridActivities.length === 0 ? (
            <View className="items-center px-8 pt-8 pb-2">
              <Text className="text-5xl mb-4">🎯</Text>
              <Text className="text-lg font-medium text-gray-600 dark:text-gray-400 text-center">
                {t("activitiesEmpty")}
              </Text>
              <TouchableOpacity onPress={() => setCreateActivityOpen(true)}>
                <Text className="text-sm text-amber-600 dark:text-amber-400 text-center mt-2">
                  {t("tapToAdd")}
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View className="px-3 pt-3">
              {gridRows.map((row, rowIndex) => (
                <View key={row[0].id} className="flex-row">
                  {row.map((activity, colIndex) => (
                    <ActikoGridItem
                      key={activity.id}
                      activity={activity}
                      index={rowIndex * numColumns + colIndex}
                      reduceMotion={reduceMotion}
                      summary={summaryByActivity.get(activity.id)}
                      iconBlob={iconBlobMap.get(activity.id)}
                      onPress={setSelectedActivity}
                      onEdit={setEditActivity}
                    />
                  ))}
                  {/* 最終行の余りを埋めて、カード幅を他の行と揃える */}
                  {Array.from(
                    { length: numColumns - row.length },
                    (_, i) => i,
                  ).map((i) => (
                    <View key={`spacer-${i}`} style={{ flex: 1 }} />
                  ))}
                </View>
              ))}
            </View>
          )}

          {/* 追加・並び替えはグリッドのカードにせず、高さを取らない操作行に置く */}
          <View className="flex-row items-center justify-end gap-1 px-4 mt-1">
            {gridActivities.length >= 2 && (
              <TouchableOpacity
                className="flex-row items-center gap-1 px-2 py-2"
                onPress={() => setReorderOpen(true)}
                accessibilityRole="button"
                accessibilityLabel={t("reorder")}
                testID={mobileTestIds.actiko.reorderButton}
              >
                <ArrowUpDown size={13} color="#78716c" />
                <Text className="text-xs text-gray-500 dark:text-gray-400">
                  {t("reorder")}
                </Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              className="flex-row items-center gap-1 px-2 py-2"
              onPress={() => setCreateActivityOpen(true)}
              accessibilityRole="button"
              accessibilityLabel={t("add")}
              testID={mobileTestIds.actiko.addActivityButton}
            >
              <Plus size={13} color="#78716c" />
              <Text className="text-xs text-gray-500 dark:text-gray-400">
                {t("add")}
              </Text>
            </TouchableOpacity>
          </View>

          {/* その日の記録: タップで編集、スワイプで削除 */}
          <View className="px-4 mt-3 mb-5">
            <View className="flex-row items-center justify-between mb-2">
              <Text className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                {tActivity("daily.recordsSection")}
              </Text>
              {logs.length > 0 && (
                <Text className="text-xs text-gray-400 dark:text-gray-500">
                  {logs.length}
                </Text>
              )}
            </View>
            <DayLogList
              logs={logs}
              activitiesMap={activitiesMap}
              kindsMap={kindsMap}
              iconBlobMap={iconBlobMap}
              onSelect={setEditingLog}
              onDelete={async (log) => {
                await activityLogRepository.softDeleteActivityLog(log.id);
                syncEngine.syncActivityLogs();
              }}
            />
          </View>

          {/* その日のタスク */}
          <DailyTaskSection {...page} />
        </ScrollView>
      )}

      {editingLog && (
        <EditLogDialog
          log={editingLog}
          activity={activitiesMap.get(editingLog.activityId) ?? null}
          onClose={() => setEditingLog(null)}
        />
      )}

      <ActikoDialogs
        recordVisible={selectedActivity !== null}
        onRecordClose={() => setSelectedActivity(null)}
        selectedActivity={selectedActivity}
        date={date}
        createVisible={createActivityOpen}
        onCreateClose={() => setCreateActivityOpen(false)}
        editActivity={editActivity}
        onEditClose={() => setEditActivity(null)}
        reorderVisible={reorderOpen}
        onReorderClose={() => setReorderOpen(false)}
        activities={gridActivities}
      />
    </View>
  );
}

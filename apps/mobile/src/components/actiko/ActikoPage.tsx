import { useCallback, useState } from "react";

import { useTranslation } from "@packages/i18n";
import { ArrowUpDown, Plus } from "lucide-react-native";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useReduceMotion } from "../../hooks/useReduceMotion";
import { syncEngine } from "../../sync/syncEngine";
import { CalendarPopover } from "../common/CalendarPopover";
import { ActikoDialogs } from "./ActikoDialogs";
import { ActikoGridItem } from "./ActikoGridItem";
import { DateNavHeader } from "./DateNavHeader";
import { useActikoPage } from "./useActikoPage";

export function ActikoPage() {
  const { t } = useTranslation("actiko");
  const {
    date,
    setDate,
    goToPrev,
    goToNext,
    isToday,
    activities,
    activitiesReady,
    iconBlobMap,
    selectedActivity,
    setSelectedActivity,
    dialogOpen,
    setDialogOpen,
    createActivityOpen,
    setCreateActivityOpen,
    editActivity,
    setEditActivity,
    calendarOpen,
    setCalendarOpen,
    hasLogsForActivity,
    handleActivityClick,
    handleActivityChanged,
    reorderOpen,
    setReorderOpen,
  } = useActikoPage();

  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const effectiveWidth = Math.min(screenWidth, 768);
  const numColumns = Math.min(4, Math.max(2, Math.floor(effectiveWidth / 180)));

  const reduceMotion = useReduceMotion();

  // Pull-to-refresh support
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await syncEngine.syncAll();
    } finally {
      setRefreshing(false);
    }
  }, []);

  const gridActions = [
    {
      id: "__add__",
      icon: Plus,
      label: t("add"),
      onPress: () => setCreateActivityOpen(true),
    },
    {
      id: "__reorder__",
      icon: ArrowUpDown,
      label: t("reorder"),
      onPress: () => setReorderOpen(true),
    },
  ];

  const handleRecordClose = () => {
    setDialogOpen(false);
    setSelectedActivity(null);
  };

  type GridItem =
    | (typeof activities)[number]
    | { id: "__add__"; name?: never }
    | { id: "__reorder__"; name?: never }
    | { id: `__spacer_${number}`; name?: never };

  const actionItems: GridItem[] = [{ id: "__add__" as const }];
  if (activities.length >= 2) {
    actionItems.push({ id: "__reorder__" as const });
  }
  const itemsWithAdd: GridItem[] = [...activities, ...actionItems];
  const remainder = itemsWithAdd.length % numColumns;
  const spacers: GridItem[] =
    remainder === 0
      ? []
      : Array.from({ length: numColumns - remainder }, (_, i) => ({
          id: `__spacer_${i}` as const,
        }));
  const gridData: GridItem[] = [...itemsWithAdd, ...spacers];

  return (
    <View className="flex-1">
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

      {/* Activity grid */}
      {!activitiesReady ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#3b82f6" />
        </View>
      ) : activities.length === 0 ? (
        <View className="flex-1 items-center justify-center px-8">
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
        <FlatList
          key={numColumns}
          data={gridData}
          numColumns={numColumns}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{
            padding: 8,
            paddingBottom: 80 + insets.bottom,
          }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          renderItem={({ item, index }) => (
            <ActikoGridItem
              item={item}
              index={index}
              reduceMotion={reduceMotion}
              iconBlobMap={iconBlobMap}
              hasLogsForActivity={hasLogsForActivity}
              onActivityPress={handleActivityClick}
              onActivityEdit={setEditActivity}
              actions={gridActions}
            />
          )}
        />
      )}

      <ActikoDialogs
        recordVisible={dialogOpen && selectedActivity !== null}
        onRecordClose={handleRecordClose}
        selectedActivity={selectedActivity}
        date={date}
        createVisible={createActivityOpen}
        onCreateClose={() => setCreateActivityOpen(false)}
        editActivity={editActivity}
        onEditClose={() => setEditActivity(null)}
        onActivityChanged={handleActivityChanged}
        reorderVisible={reorderOpen}
        onReorderClose={() => setReorderOpen(false)}
        activities={activities}
      />
    </View>
  );
}

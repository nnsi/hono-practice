import dayjs from "dayjs";
import {
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Plus,
} from "lucide-react-native";
import {
  FlatList,
  Platform,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { CalendarPopover } from "../common/CalendarPopover";
import { ActivityCard } from "./ActivityCard";
import { CreateActivityDialog } from "./CreateActivityDialog";
import { EditActivityDialog } from "./EditActivityDialog";
import { RecordDialog } from "./RecordDialog";
import { ReorderActivitiesDialog } from "./ReorderActivitiesDialog";
import { useActikoPage } from "./useActikoPage";

export function ActikoPage() {
  const {
    date,
    setDate,
    goToPrev,
    goToNext,
    isToday,
    activities,
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

  const handleRecordClose = () => {
    setDialogOpen(false);
    setSelectedActivity(null);
  };

  const dateLabel = dayjs(date).format("M/D (ddd)");

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
      {/* Date navigation header */}
      <View className="relative flex-row items-center justify-center h-12 bg-white border-b border-gray-200">
        <TouchableOpacity className="absolute left-4 p-2" onPress={goToPrev}>
          <ChevronLeft size={20} color="#78716c" />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setCalendarOpen(!calendarOpen)}
          className="flex-row items-center"
        >
          {isToday ? (
            <View className="bg-gray-900 rounded-xl px-4 py-1">
              <Text className="text-white text-base font-medium">
                {dateLabel}
              </Text>
            </View>
          ) : (
            <View className="px-4 py-1">
              <Text className="text-base font-medium text-gray-800">
                {dateLabel}
              </Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity className="absolute right-4 p-2" onPress={goToNext}>
          <ChevronRight size={20} color="#78716c" />
        </TouchableOpacity>
      </View>

      {/* Calendar popover */}
      <CalendarPopover
        selectedDate={date}
        onDateSelect={setDate}
        isOpen={calendarOpen}
        onClose={() => setCalendarOpen(false)}
      />

      {/* Activity grid */}
      {activities.length === 0 ? (
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-5xl mb-4">🎯</Text>
          <Text className="text-lg font-medium text-gray-600 text-center">
            アクティビティがありません
          </Text>
          <TouchableOpacity onPress={() => setCreateActivityOpen(true)}>
            <Text className="text-sm text-amber-600 text-center mt-2">
              タップして追加しましょう
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
          renderItem={({ item, index }) => {
            if (item.id.startsWith("__spacer_")) {
              return <View className="flex-1 m-1" />;
            }
            if (item.id === "__add__") {
              return (
                <TouchableOpacity
                  className="flex-1 m-1 rounded-2xl border-2 border-dashed border-gray-300 items-center justify-center min-h-[120px]"
                  onPress={() => setCreateActivityOpen(true)}
                  activeOpacity={0.7}
                >
                  <Plus size={28} color="#a8a29e" />
                  <Text className="text-xs text-gray-400 mt-1">追加</Text>
                </TouchableOpacity>
              );
            }
            if (item.id === "__reorder__") {
              return (
                <TouchableOpacity
                  className="flex-1 m-1 rounded-2xl border-2 border-dashed border-gray-300 items-center justify-center min-h-[120px]"
                  onPress={() => setReorderOpen(true)}
                  activeOpacity={0.7}
                >
                  <ArrowUpDown size={28} color="#a8a29e" />
                  <Text className="text-xs text-gray-400 mt-1">並び替え</Text>
                </TouchableOpacity>
              );
            }
            const activity = item as (typeof activities)[number];
            const card = (
              <ActivityCard
                activity={activity}
                isDone={hasLogsForActivity(activity.id)}
                iconBlob={iconBlobMap.get(activity.id)}
                onPress={() => handleActivityClick(activity)}
                onEdit={() => setEditActivity(activity)}
              />
            );
            if (Platform.OS === "web") {
              return card;
            }
            return (
              <Animated.View
                entering={FadeInDown.delay(index * 35)
                  .duration(350)
                  .springify()}
                style={{ flex: 1 }}
              >
                {card}
              </Animated.View>
            );
          }}
        />
      )}

      {/* Record dialog */}
      <RecordDialog
        visible={dialogOpen && selectedActivity !== null}
        onClose={handleRecordClose}
        activity={selectedActivity}
        date={date}
      />

      {/* Create activity dialog */}
      <CreateActivityDialog
        visible={createActivityOpen}
        onClose={() => setCreateActivityOpen(false)}
        onCreated={handleActivityChanged}
      />

      {/* Edit activity dialog */}
      <EditActivityDialog
        visible={editActivity !== null}
        onClose={() => setEditActivity(null)}
        activity={editActivity}
        onUpdated={handleActivityChanged}
      />

      {/* Reorder dialog */}
      <ReorderActivitiesDialog
        visible={reorderOpen}
        onClose={() => setReorderOpen(false)}
        activities={activities}
      />
    </View>
  );
}

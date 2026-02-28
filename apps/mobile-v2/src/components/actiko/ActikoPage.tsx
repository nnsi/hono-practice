import { View, Text, FlatList, TouchableOpacity, Platform } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Calendar,
} from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import dayjs from "dayjs";
import { useActikoPage } from "./useActikoPage";
import { ActivityCard } from "./ActivityCard";
import { RecordDialog } from "./RecordDialog";
import { CreateActivityDialog } from "./CreateActivityDialog";
import { EditActivityDialog } from "./EditActivityDialog";
import { CalendarPopover } from "../common/CalendarPopover";

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
  } = useActikoPage();

  const insets = useSafeAreaInsets();

  const handleRecordClose = () => {
    setDialogOpen(false);
    setSelectedActivity(null);
  };

  const dateLabel = dayjs(date).format("M/D (ddd)");

  type GridItem =
    | (typeof activities)[number]
    | { id: "__add__"; name?: never };

  const gridData: GridItem[] = [
    ...activities,
    { id: "__add__" as const },
  ];

  return (
    <View className="flex-1 bg-gray-50">
      {/* Date navigation header */}
      <View className="relative flex-row items-center justify-center h-12 bg-white border-b border-gray-200">
        <TouchableOpacity
          className="absolute left-4 p-2"
          onPress={goToPrev}
        >
          <ChevronLeft size={20} color="#78716c" />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setCalendarOpen(!calendarOpen)}
          className="flex-row items-center"
        >
          {isToday ? (
            <View className="bg-gray-900 rounded-xl px-4 py-1 flex-row items-center">
              <Text className="text-white text-base font-medium">
                {dateLabel}
              </Text>
              <Calendar size={14} color="#ffffff" style={{ marginLeft: 6 }} />
            </View>
          ) : (
            <View className="flex-row items-center px-4 py-1">
              <Text className="text-base font-medium text-gray-800">
                {dateLabel}
              </Text>
              <Calendar size={14} color="#78716c" style={{ marginLeft: 6 }} />
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          className="absolute right-4 p-2"
          onPress={goToNext}
        >
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
          data={gridData}
          numColumns={2}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 8, paddingBottom: 80 + insets.bottom }}
          renderItem={({ item, index }) => {
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
    </View>
  );
}

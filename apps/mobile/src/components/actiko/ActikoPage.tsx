import { ArrowUpDown, Plus } from "lucide-react-native";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  TouchableOpacity,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { CalendarPopover } from "../common/CalendarPopover";
import { ActionCard } from "./ActionCard";
import { ActivityCard } from "./ActivityCard";
import { ActikoDialogs } from "./ActikoDialogs";
import { DateNavHeader } from "./DateNavHeader";
import { useActikoPage } from "./useActikoPage";

export function ActikoPage() {
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
            let card: React.ReactNode;
            if (item.id === "__add__") {
              card = (
                <ActionCard
                  icon={Plus}
                  label="追加"
                  onPress={() => setCreateActivityOpen(true)}
                />
              );
            } else if (item.id === "__reorder__") {
              card = (
                <ActionCard
                  icon={ArrowUpDown}
                  label="並び替え"
                  onPress={() => setReorderOpen(true)}
                />
              );
            } else {
              const activity = item as (typeof activities)[number];
              card = (
                <ActivityCard
                  activity={activity}
                  isDone={hasLogsForActivity(activity.id)}
                  iconBlob={iconBlobMap.get(activity.id)}
                  onPress={() => handleActivityClick(activity)}
                  onEdit={() => setEditActivity(activity)}
                />
              );
            }
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

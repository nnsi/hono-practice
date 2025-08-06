import { useRef, useState } from "react";

import {
  Dimensions,
  Pressable,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";

import type {
  GetActivityLogsResponse,
  GetActivityResponse,
} from "@dtos/response";

import {
  ActivityEditDialog,
  ActivityLogCreateDialog,
  NewActivityDialog,
} from "../../../src/components/activity";
import { useActivities, useGlobalDate } from "../../../src/hooks";

export default function Home() {
  const { selectedDate: date, setSelectedDate: setDate } = useGlobalDate();
  const [selectedActivity, setSelectedActivity] =
    useState<GetActivityResponse | null>(null);
  const [newActivityModalOpen, setNewActivityModalOpen] = useState(false);
  const [logModalOpen, setLogModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editTargetActivity, setEditTargetActivity] =
    useState<GetActivityResponse | null>(null);
  const longPressTimer = useRef<number | null>(null);

  const { activities, activityLogs } = useActivities(date);

  // 画面幅に基づいて列数を決定（タブレットなら4列、スマホなら2列）
  const screenWidth = Dimensions.get("window").width;
  const numColumns = screenWidth >= 768 ? 4 : 2;
  const cardWidth = `${100 / numColumns}%`;

  const handleActivityClick = (activity: GetActivityResponse) => {
    setSelectedActivity(activity);
    setLogModalOpen(true);
  };

  const handleNewActivityClick = () => {
    setNewActivityModalOpen(true);
  };

  const handleActivityCardPressIn = (activity: GetActivityResponse) => {
    longPressTimer.current = window.setTimeout(() => {
      setEditTargetActivity(activity);
      setEditModalOpen(true);
    }, 700);
  };

  const handleActivityCardPressOut = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const renderActivityCard = (item: GetActivityResponse | "new") => {
    if (item === "new") {
      return (
        <View key="new" style={{ width: cardWidth as any, padding: 8 }}>
          <Pressable
            className="bg-white rounded-3xl p-4 shadow-md items-center justify-center aspect-square"
            onPress={handleNewActivityClick}
          >
            <Ionicons name="add" size={48} color="#000" />
          </Pressable>
        </View>
      );
    }

    const hasActivityLogs = activityLogs.some(
      (log: GetActivityLogsResponse[number]) => log.activity.id === item.id,
    );

    return (
      <View key={item.id} style={{ width: cardWidth as any, padding: 8 }}>
        <Pressable
          className={`rounded-3xl p-4 shadow-md items-center justify-center aspect-square ${
            hasActivityLogs ? "bg-lime-100" : "bg-white"
          }`}
          onPress={() => handleActivityClick(item)}
          onPressIn={() => handleActivityCardPressIn(item)}
          onPressOut={handleActivityCardPressOut}
        >
          <Text className="text-4xl mb-1">{item.emoji}</Text>
          <Text className="text-xs text-gray-800 font-medium text-center">
            {item.name}
          </Text>
        </Pressable>
      </View>
    );
  };

  const activityData: (GetActivityResponse | "new")[] = [...activities, "new"];

  const goToPreviousDay = () => {
    const newDate = new Date(date);
    newDate.setDate(newDate.getDate() - 1);
    setDate(newDate);
  };

  const goToNextDay = () => {
    const newDate = new Date(date);
    newDate.setDate(newDate.getDate() + 1);
    setDate(newDate);
  };

  const goToToday = () => {
    setDate(new Date());
  };

  return (
    <View className="flex-1 bg-gray-50">
      {/* Date Header */}
      <View className="bg-white px-4 py-4">
        <View className="flex-row items-center justify-center gap-3">
          <TouchableOpacity onPress={goToToday} className="p-1">
            <Ionicons name="time-outline" size={18} color="#374151" />
          </TouchableOpacity>

          <TouchableOpacity onPress={goToPreviousDay} className="p-1">
            <Ionicons name="chevron-back" size={18} color="#374151" />
          </TouchableOpacity>

          <Text className="text-base">
            {new Date(date).toLocaleDateString("en-US", {
              year: "numeric",
              month: "numeric",
              day: "numeric",
            })}
          </Text>

          <TouchableOpacity onPress={goToNextDay} className="p-1">
            <Ionicons name="chevron-forward" size={18} color="#374151" />
          </TouchableOpacity>

          <TouchableOpacity className="p-1">
            <Ionicons name="calendar-outline" size={18} color="#374151" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Separator */}
      <View className="h-px bg-gray-200 mx-4 my-3" />

      {/* Activity Grid */}
      <ScrollView className="flex-1">
        <View className="flex-row flex-wrap">
          {activityData.map((item) => renderActivityCard(item))}
        </View>
      </ScrollView>

      {/* Dialogs */}
      <NewActivityDialog
        open={newActivityModalOpen}
        onOpenChange={setNewActivityModalOpen}
      />
      {selectedActivity && (
        <ActivityLogCreateDialog
          open={logModalOpen}
          onOpenChange={setLogModalOpen}
          activity={selectedActivity}
          date={date}
        />
      )}
      <ActivityEditDialog
        open={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        activity={editTargetActivity}
      />

      <StatusBar style="auto" />
    </View>
  );
}

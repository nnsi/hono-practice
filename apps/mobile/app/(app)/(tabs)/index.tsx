import { useRef, useState } from "react";

import {
  FlatList,
  Pressable,
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
  const { date, setDate } = useGlobalDate();
  const [selectedActivity, setSelectedActivity] =
    useState<GetActivityResponse | null>(null);
  const [newActivityModalOpen, setNewActivityModalOpen] = useState(false);
  const [logModalOpen, setLogModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editTargetActivity, setEditTargetActivity] =
    useState<GetActivityResponse | null>(null);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);

  const { activities, activityLogs, isLoading, error } = useActivities(date);

  const handleActivityClick = (activity: GetActivityResponse) => {
    setSelectedActivity(activity);
    setLogModalOpen(true);
  };

  const handleNewActivityClick = () => {
    setNewActivityModalOpen(true);
  };

  const handleActivityCardPressIn = (activity: GetActivityResponse) => {
    longPressTimer.current = setTimeout(() => {
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

  const renderActivityCard = ({
    item,
  }: { item: GetActivityResponse | "new" }) => {
    if (item === "new") {
      return (
        <TouchableOpacity
          className="bg-white rounded-3xl p-6 m-2 shadow-md items-center justify-center aspect-square"
          onPress={handleNewActivityClick}
        >
          <Ionicons name="add" size={64} color="#000" />
        </TouchableOpacity>
      );
    }

    const hasActivityLogs = activityLogs.some(
      (log: GetActivityLogsResponse[number]) => log.activity.id === item.id,
    );

    return (
      <Pressable
        className={`rounded-3xl p-6 m-2 shadow-md items-center justify-center aspect-square ${
          hasActivityLogs ? "bg-lime-100" : "bg-white"
        }`}
        onPress={() => handleActivityClick(item)}
        onPressIn={() => handleActivityCardPressIn(item)}
        onPressOut={handleActivityCardPressOut}
      >
        <Text className="text-5xl mb-2">{item.emoji}</Text>
        <Text className="text-sm text-gray-800 font-medium text-center">
          {item.name}
        </Text>
      </Pressable>
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

  const isToday = new Date(date).toDateString() === new Date().toDateString();

  return (
    <View className="flex-1 bg-gray-50">
      {/* Date Header */}
      <View className="bg-white px-4 py-3 border-b border-gray-200">
        <View className="flex-row items-center justify-between">
          <TouchableOpacity onPress={goToPreviousDay} className="p-2">
            <Ionicons name="chevron-back" size={24} color="#374151" />
          </TouchableOpacity>

          <TouchableOpacity onPress={goToToday} className="flex-1">
            <Text className="text-lg font-medium text-center">
              {new Date(date).toLocaleDateString("ja-JP", {
                month: "long",
                day: "numeric",
                weekday: "short",
              })}
            </Text>
            {!isToday && (
              <Text className="text-xs text-gray-500 text-center">
                タップして今日に戻る
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={goToNextDay} className="p-2">
            <Ionicons name="chevron-forward" size={24} color="#374151" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Activity Grid */}
      <FlatList
        data={activityData}
        renderItem={renderActivityCard}
        keyExtractor={(item) => (item === "new" ? "new" : item.id)}
        numColumns={2}
        contentContainerStyle={{ padding: 8 }}
        columnWrapperStyle={{ justifyContent: "space-between" }}
      />

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

import { ExtensionStorage } from "@bacons/apple-targets";
import {
  convertSecondsToUnit,
  generateTimeMemo,
  getTimeUnitType,
} from "@packages/domain/time/timeUtils";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Platform, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { KindSelector } from "../../src/components/recording-modes/parts/KindSelector";
import { useActivityKinds } from "../../src/hooks/useActivityKinds";
import { activityLogRepository } from "../../src/repositories/activityLogRepository";
import { activityRepository } from "../../src/repositories/activityRepository";

function getWidgetStorage() {
  if (Platform.OS !== "ios") return null;
  try {
    const { Paths } =
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      require("expo-file-system") as typeof import("expo-file-system");
    const containers = Paths.appleSharedContainers;
    const groupId = Object.keys(containers)[0];
    if (!groupId) return null;
    return new ExtensionStorage(groupId);
  } catch {
    return null;
  }
}

export default function WidgetKindSelectPage() {
  const { activityId } = useLocalSearchParams<{ activityId: string }>();
  const router = useRouter();
  const { kinds } = useActivityKinds(activityId);
  const [selectedKindId, setSelectedKindId] = useState<string | null>(null);
  const [activityName, setActivityName] = useState("");

  useEffect(() => {
    if (!activityId) return;
    activityRepository.getAllActivities().then((activities) => {
      const found = activities.find((a) => a.id === activityId);
      if (found) setActivityName(`${found.emoji} ${found.name}`);
    });
  }, [activityId]);

  const handleSave = async () => {
    if (!activityId || !selectedKindId) return;

    const storage = getWidgetStorage();
    const key = (field: string) => `timer_${activityId}_${field}`;

    // Read timer state from widget's UserDefaults
    const accumulatedMs = Number(storage?.get(key("accumulatedMillis")) ?? 0);
    const startDateIso = storage?.get(key("startDateIso")) as string | null;
    const elapsedSeconds = Math.floor(accumulatedMs / 1000);

    // Get activity for quantity unit conversion
    const activities = await activityRepository.getAllActivities();
    const activity = activities.find((a) => a.id === activityId);
    const unitType = getTimeUnitType(activity?.quantityUnit ?? null);
    const quantity = convertSecondsToUnit(elapsedSeconds, unitType);

    // Generate time memo
    const memo =
      startDateIso && !isNaN(Date.parse(startDateIso))
        ? generateTimeMemo(new Date(startDateIso), new Date())
        : "";

    // Save activity log
    const today = new Date().toISOString().slice(0, 10);
    await activityLogRepository.createActivityLog({
      activityId,
      activityKindId: selectedKindId,
      quantity,
      memo,
      date: today,
      time: null,
      taskId: null,
    });

    // Reset widget timer state
    if (storage) {
      storage.set(key("accumulatedMillis"), "0");
      storage.set(key("isRunning"), "false");
      storage.set(key("startTimeMillis"), "0");
      storage.set(key("pendingKindSelect"), "false");
      storage.remove(key("startDateIso"));
      ExtensionStorage.reloadWidget();
    }

    router.replace("/(tabs)/daily");
  };

  if (!activityId) {
    return (
      <SafeAreaView className="flex-1 bg-white justify-center items-center">
        <Text>Activity ID が指定されていません</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="p-6 gap-6">
        <Text className="text-xl font-bold">
          {activityName || "種類を選択"}
        </Text>
        <KindSelector
          kinds={kinds}
          selectedKindId={selectedKindId}
          onSelect={setSelectedKindId}
        />
        <TouchableOpacity
          onPress={handleSave}
          disabled={!selectedKindId}
          className={`py-3 rounded-lg items-center ${
            selectedKindId ? "bg-gray-900" : "bg-gray-300"
          }`}
        >
          <Text className="text-white font-bold text-base">記録する</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

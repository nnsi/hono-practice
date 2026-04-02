import { useTranslation } from "@packages/i18n";
import { Plus } from "lucide-react-native";
import { Text, TouchableOpacity, View } from "react-native";

import { activityLogRepository } from "../../repositories/activityLogRepository";
import { syncEngine } from "../../sync/syncEngine";
import { LogCard } from "./LogCard";

type Activity = {
  id: string;
  name: string;
  emoji: string;
  quantityUnit: string;
  iconType?: "emoji" | "upload" | "generate";
  iconUrl?: string | null;
  iconThumbnailUrl?: string | null;
};

type Kind = {
  id: string;
  name: string;
  color: string | null;
};

type Log = {
  id: string;
  activityId: string;
  activityKindId: string | null;
  quantity: number | null;
  memo: string;
  date: string;
  time: string | null;
  _syncStatus?: "synced" | "pending" | "failed" | "rejected";
};

type IconBlob = { base64: string; mimeType: string };

export function DailyLogSection({
  logs,
  activitiesMap,
  kindsMap,
  iconBlobMap,
  onAddPress,
  onLogPress,
}: {
  logs: Log[];
  activitiesMap: Map<string, Activity>;
  kindsMap: Map<string, Kind>;
  iconBlobMap: Map<string, IconBlob>;
  onAddPress: () => void;
  onLogPress: (log: Log) => void;
}) {
  const { t } = useTranslation("activity");

  return (
    <View className="px-4 pt-4">
      <View className="flex-row items-center justify-between mb-3">
        <Text className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
          {t("daily.activitySection")}
        </Text>
        <TouchableOpacity
          className="flex-row items-center gap-1"
          onPress={onAddPress}
          accessibilityRole="button"
          accessibilityLabel={t("daily.addButton")}
        >
          <Plus size={16} color="#2563eb" />
          <Text className="text-sm text-blue-600 dark:text-blue-400 font-medium">
            {t("daily.addButton")}
          </Text>
        </TouchableOpacity>
      </View>

      {logs.length > 0 ? (
        <View className="gap-2">
          {logs.map((log) => {
            const activity = activitiesMap.get(log.activityId);
            const kind = log.activityKindId
              ? kindsMap.get(log.activityKindId)
              : null;
            return (
              <LogCard
                key={log.id}
                log={log}
                activity={activity ?? null}
                kind={kind ?? null}
                iconBlob={iconBlobMap.get(log.activityId)}
                onPress={() => onLogPress(log)}
                onDelete={async () => {
                  await activityLogRepository.softDeleteActivityLog(log.id);
                  syncEngine.syncActivityLogs();
                }}
              />
            );
          })}
        </View>
      ) : (
        <View className="items-center py-8">
          <Text className="text-sm text-gray-400 dark:text-gray-500">
            {t("daily.noRecords")}
          </Text>
        </View>
      )}
    </View>
  );
}

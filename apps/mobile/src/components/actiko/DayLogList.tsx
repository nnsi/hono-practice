import type { ActivityLogBase } from "@packages/frontend-shared/hooks/types";
import { formatQuantityWithUnit } from "@packages/frontend-shared/utils/statsFormatting";
import { useTranslation } from "@packages/i18n";
import { Trash2 } from "lucide-react-native";
import { ActivityIndicator, Text, TouchableOpacity, View } from "react-native";
import { Swipeable } from "react-native-gesture-handler";

import { mobileTestIdsExt } from "../../testing/testIdsExt";
import { ActivityIcon } from "../common/ActivityIcon";

type Activity = {
  name: string;
  emoji: string;
  quantityUnit: string;
  iconType?: "emoji" | "upload" | "generate";
  iconUrl?: string | null;
  iconThumbnailUrl?: string | null;
  deletedAt?: unknown;
};

type Kind = { name: string; color: string | null };

type IconBlob = { base64: string; mimeType: string };

/** その日の記録を 1 行ずつ詰めて並べる。行タップで編集、左スワイプで削除。 */
export function DayLogList({
  logs,
  activitiesMap,
  kindsMap,
  iconBlobMap,
  onSelect,
  onDelete,
}: {
  logs: ActivityLogBase[];
  activitiesMap: Map<string, Activity>;
  kindsMap: Map<string, Kind>;
  iconBlobMap: Map<string, IconBlob>;
  onSelect: (log: ActivityLogBase) => void;
  onDelete: (log: ActivityLogBase) => void;
}) {
  const { t } = useTranslation("activity");

  if (logs.length === 0) {
    return (
      <View className="items-center py-4">
        <Text className="text-sm text-gray-400 dark:text-gray-500">
          {t("daily.noRecords")}
        </Text>
      </View>
    );
  }

  return (
    <View className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden">
      {logs.map((log, index) => {
        const activity = activitiesMap.get(log.activityId);
        const kind = log.activityKindId
          ? kindsMap.get(log.activityKindId)
          : undefined;
        const isPending = log._syncStatus === "pending";
        const name = activity?.name ?? t("log.unknownActivity");
        const quantityLabel =
          log.quantity !== null
            ? formatQuantityWithUnit(log.quantity, activity?.quantityUnit ?? "")
            : "-";
        return (
          <Swipeable
            key={log.id}
            renderRightActions={() => (
              <TouchableOpacity
                style={{
                  width: 72,
                  backgroundColor: "#ef4444",
                  alignItems: "center",
                  justifyContent: "center",
                }}
                onPress={() => onDelete(log)}
                accessibilityRole="button"
                accessibilityLabel="Delete log"
              >
                <Trash2 size={18} color="#ffffff" />
              </TouchableOpacity>
            )}
          >
            <TouchableOpacity
              className={`flex-row items-center gap-2.5 px-3 py-2.5 ${
                isPending
                  ? "bg-amber-50 dark:bg-amber-900/20"
                  : "bg-white dark:bg-gray-800"
              } ${
                index > 0 ? "border-t border-gray-100 dark:border-gray-700" : ""
              }`}
              style={{ opacity: activity?.deletedAt ? 0.5 : 1 }}
              onPress={() => onSelect(log)}
              activeOpacity={0.9}
              accessibilityRole="button"
              accessibilityLabel={`${name}, ${quantityLabel}`}
              testID={mobileTestIdsExt.dayLog.row(log.id)}
            >
              <View className="w-6 h-6 items-center justify-center shrink-0">
                <ActivityIcon
                  iconType={activity?.iconType}
                  emoji={activity?.emoji || "\u{1f4dd}"}
                  iconBlob={iconBlobMap.get(log.activityId)}
                  iconUrl={activity?.iconUrl}
                  iconThumbnailUrl={activity?.iconThumbnailUrl}
                  size={24}
                  fontSize="text-lg"
                />
              </View>
              <View className="flex-1 min-w-0 flex-row items-center gap-1.5">
                <Text
                  className="text-sm font-medium text-gray-800 dark:text-gray-200 shrink"
                  numberOfLines={1}
                >
                  {name}
                </Text>
                {kind && (
                  <View className="flex-row items-center gap-1 bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded-md shrink-0">
                    {kind.color && (
                      <View
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ backgroundColor: kind.color }}
                      />
                    )}
                    <Text className="text-[11px] text-gray-500 dark:text-gray-400">
                      {kind.name}
                    </Text>
                  </View>
                )}
                {log.memo ? (
                  <Text
                    className="text-xs text-gray-400 dark:text-gray-500 flex-1"
                    numberOfLines={1}
                  >
                    {log.memo}
                  </Text>
                ) : null}
              </View>
              {isPending && <ActivityIndicator size="small" color="#f97316" />}
              <Text className="text-sm font-semibold text-gray-700 dark:text-gray-300 shrink-0">
                {quantityLabel}
              </Text>
            </TouchableOpacity>
          </Swipeable>
        );
      })}
    </View>
  );
}

import { useTranslation } from "@packages/i18n";
import { ActivityIndicator, Text, TouchableOpacity, View } from "react-native";

import { ActivityIcon } from "../common/ActivityIcon";

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

type IconBlob = {
  base64: string;
  mimeType: string;
};

export function LogCard({
  log,
  activity,
  kind,
  iconBlob,
  onPress,
}: {
  log: {
    id: string;
    activityId: string;
    activityKindId: string | null;
    quantity: number | null;
    memo: string;
    _syncStatus?: "synced" | "pending" | "failed" | "rejected";
  };
  activity: Activity | null;
  kind: Kind | null;
  iconBlob?: IconBlob;
  onPress: () => void;
}) {
  const { t } = useTranslation("activity");
  const isPending = log._syncStatus === "pending";

  return (
    <TouchableOpacity
      className={`flex-row items-center gap-3 p-3.5 rounded-2xl ${
        isPending
          ? "border border-amber-200 bg-amber-50 dark:bg-amber-900/20"
          : "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
      }`}
      style={{
        shadowColor: "#1c1917",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 3,
        elevation: 2,
      }}
      onPress={onPress}
      activeOpacity={0.95}
    >
      {/* Icon */}
      <View className="w-10 h-10 items-center justify-center shrink-0">
        <ActivityIcon
          iconType={activity?.iconType}
          emoji={activity?.emoji || "\u{1f4dd}"}
          iconBlob={iconBlob}
          iconUrl={activity?.iconUrl}
          iconThumbnailUrl={activity?.iconThumbnailUrl}
        />
      </View>

      {/* Content */}
      <View className="flex-1 min-w-0">
        <View className="flex-row items-center gap-1.5">
          <Text
            className="text-base font-semibold text-gray-800 dark:text-gray-200"
            numberOfLines={1}
          >
            {activity?.name ?? t("log.unknownActivity")}
          </Text>
          {kind && (
            <View className="flex-row items-center gap-1 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-lg shrink-0">
              {kind.color && (
                <View
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: kind.color }}
                />
              )}
              <Text className="text-xs text-gray-500 dark:text-gray-400">
                {kind.name}
              </Text>
            </View>
          )}
          {isPending && (
            <ActivityIndicator size="small" color="#f97316" className="ml-1" />
          )}
        </View>
        <Text className="text-sm text-gray-500 dark:text-gray-400">
          {log.quantity !== null
            ? `${log.quantity}${activity?.quantityUnit ?? ""}`
            : "-"}
        </Text>
        {log.memo ? (
          <Text
            className="text-xs text-gray-400 dark:text-gray-500 mt-0.5"
            numberOfLines={1}
          >
            {log.memo}
          </Text>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

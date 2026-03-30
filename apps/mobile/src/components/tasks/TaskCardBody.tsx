import dayjs from "dayjs";
import { CalendarDays, FileText } from "lucide-react-native";
import { Image, Text, TouchableOpacity, View } from "react-native";

type LinkedActivity = {
  name: string;
  emoji?: string;
  iconType?: "emoji" | "upload" | "generate";
  iconUrl?: string | null;
  iconThumbnailUrl?: string | null;
  quantityUnit?: string;
};

type LinkedKind = { name: string };
type IconBlob = { base64: string; mimeType: string };

type TaskCardBodyProps = {
  title: string;
  completed: boolean;
  doneDate?: string | null;
  startDate?: string | null;
  dueDate?: string | null;
  memo?: string | null;
  quantity: number | null;
  activityId?: string | null;
  linkedActivity: LinkedActivity | null;
  linkedKind: LinkedKind | null;
  iconBlobMap: Map<string, IconBlob>;
  onEdit: () => void;
};

export function TaskCardBody({
  title,
  completed,
  doneDate,
  startDate,
  dueDate,
  memo,
  quantity,
  activityId,
  linkedActivity,
  linkedKind,
  iconBlobMap,
  onEdit,
}: TaskCardBodyProps) {
  const iconBlob = activityId ? iconBlobMap.get(activityId) : undefined;

  return (
    <TouchableOpacity className="flex-1 min-w-0" onPress={onEdit}>
      <Text
        className={`text-sm font-medium ${
          completed || doneDate
            ? "line-through text-gray-500 dark:text-gray-400"
            : "text-gray-900 dark:text-gray-100"
        }`}
        numberOfLines={1}
      >
        {title}
      </Text>

      {linkedActivity && (
        <View className="flex-row items-center gap-1 mt-0.5">
          {linkedActivity.iconType === "upload" &&
          (iconBlob ||
            linkedActivity.iconThumbnailUrl ||
            linkedActivity.iconUrl) ? (
            <Image
              source={{
                uri: iconBlob
                  ? `data:${iconBlob.mimeType};base64,${iconBlob.base64}`
                  : (linkedActivity.iconThumbnailUrl ||
                      linkedActivity.iconUrl)!,
              }}
              style={{ width: 14, height: 14, borderRadius: 3 }}
              resizeMode="cover"
            />
          ) : linkedActivity.emoji ? (
            <Text className="text-xs">{linkedActivity.emoji}</Text>
          ) : null}
          <Text className="text-xs text-blue-600 dark:text-blue-400">
            {linkedActivity.name}
            {linkedKind ? ` · ${linkedKind.name}` : ""}
            {quantity !== null
              ? ` · ${quantity}${linkedActivity.quantityUnit ? ` ${linkedActivity.quantityUnit}` : ""}`
              : ""}
          </Text>
        </View>
      )}

      {(startDate || dueDate) && (
        <View className="flex-row items-center gap-1 mt-0.5">
          <CalendarDays size={12} color="#9ca3af" />
          <Text className="text-xs text-gray-500 dark:text-gray-400">
            {startDate && dayjs(startDate).format("MM/DD")}
            {startDate && dueDate && " - "}
            {dueDate && dayjs(dueDate).format("MM/DD")}
          </Text>
          {doneDate && (
            <Text className="text-xs text-green-600 dark:text-green-400 ml-2">
              完了: {dayjs(doneDate).format("MM/DD")}
            </Text>
          )}
        </View>
      )}

      {memo ? (
        <View className="flex-row items-center gap-1 mt-0.5">
          <FileText size={12} color="#9ca3af" />
          <Text
            className="text-xs text-gray-400 dark:text-gray-500 flex-1"
            numberOfLines={1}
          >
            {memo}
          </Text>
        </View>
      ) : null}
    </TouchableOpacity>
  );
}

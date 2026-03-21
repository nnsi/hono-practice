import dayjs from "dayjs";
import {
  Archive,
  CalendarCheck,
  CalendarDays,
  CheckCircle2,
  Circle,
  FileText,
  Pencil,
  Trash2,
} from "lucide-react-native";
import { Image, Text, TouchableOpacity, View } from "react-native";

import type { TaskItem } from "./types";
import { useTaskCard } from "./useTaskCard";

export function TaskCard({
  task,
  highlight = false,
  completed = false,
  archived = false,
  onToggleDone,
  onEdit,
  onDelete,
  onArchive,
  onMoveToToday,
}: {
  task: TaskItem;
  highlight?: boolean;
  completed?: boolean;
  archived?: boolean;
  onToggleDone: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onArchive: () => void;
  onMoveToToday?: () => void;
}) {
  const { linkedActivity, linkedKind, iconBlobMap, showMoveToToday } =
    useTaskCard(task, archived, onMoveToToday);

  return (
    <View
      className={`flex-row items-center gap-3 p-3.5 rounded-2xl ${
        highlight
          ? "border border-red-200 bg-red-50"
          : "bg-white border border-gray-100"
      } ${completed ? "opacity-70" : ""}`}
      style={
        !highlight
          ? {
              shadowColor: "#1c1917",
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.06,
              shadowRadius: 3,
              elevation: 2,
            }
          : undefined
      }
    >
      {/* Checkbox */}
      {!archived && (
        <TouchableOpacity
          onPress={onToggleDone}
          className="p-0.5"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          {task.doneDate ? (
            <CheckCircle2 size={22} color="#22c55e" />
          ) : (
            <Circle size={22} color="#9ca3af" />
          )}
        </TouchableOpacity>
      )}

      {/* Task body */}
      <TouchableOpacity className="flex-1 min-w-0" onPress={onEdit}>
        <Text
          className={`text-sm font-medium ${
            completed || task.doneDate
              ? "line-through text-gray-500"
              : "text-gray-900"
          }`}
          numberOfLines={1}
        >
          {task.title}
        </Text>
        {linkedActivity && (
          <View className="flex-row items-center gap-1 mt-0.5">
            {linkedActivity.iconType === "upload" &&
            (iconBlobMap.get(task.activityId!) ||
              linkedActivity.iconThumbnailUrl ||
              linkedActivity.iconUrl) ? (
              <Image
                source={{
                  uri: iconBlobMap.get(task.activityId!)
                    ? `data:${iconBlobMap.get(task.activityId!)!.mimeType};base64,${iconBlobMap.get(task.activityId!)!.base64}`
                    : (linkedActivity.iconThumbnailUrl ||
                        linkedActivity.iconUrl)!,
                }}
                style={{ width: 14, height: 14, borderRadius: 3 }}
                resizeMode="cover"
              />
            ) : linkedActivity.emoji ? (
              <Text className="text-xs">{linkedActivity.emoji}</Text>
            ) : null}
            <Text className="text-xs text-blue-600">
              {linkedActivity.name}
              {linkedKind ? ` · ${linkedKind.name}` : ""}
              {task.quantity !== null
                ? ` · ${task.quantity}${linkedActivity.quantityUnit ? ` ${linkedActivity.quantityUnit}` : ""}`
                : ""}
            </Text>
          </View>
        )}
        {(task.startDate || task.dueDate) && (
          <View className="flex-row items-center gap-1 mt-0.5">
            <CalendarDays size={12} color="#9ca3af" />
            <Text className="text-xs text-gray-500">
              {task.startDate && dayjs(task.startDate).format("MM/DD")}
              {task.startDate && task.dueDate && " - "}
              {task.dueDate && dayjs(task.dueDate).format("MM/DD")}
            </Text>
            {task.doneDate && (
              <Text className="text-xs text-green-600 ml-2">
                完了: {dayjs(task.doneDate).format("MM/DD")}
              </Text>
            )}
          </View>
        )}
        {task.memo ? (
          <View className="flex-row items-center gap-1 mt-0.5">
            <FileText size={12} color="#9ca3af" />
            <Text className="text-xs text-gray-400 flex-1" numberOfLines={1}>
              {task.memo}
            </Text>
          </View>
        ) : null}
      </TouchableOpacity>

      {/* Action buttons */}
      <View className="flex-row items-center gap-0.5">
        {showMoveToToday && (
          <TouchableOpacity
            onPress={onMoveToToday}
            className="p-1.5"
            hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
          >
            <CalendarCheck size={16} color="#9ca3af" />
          </TouchableOpacity>
        )}
        {task.doneDate && !archived && (
          <TouchableOpacity
            onPress={onArchive}
            className="p-1.5"
            hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
          >
            <Archive size={16} color="#9ca3af" />
          </TouchableOpacity>
        )}
        <TouchableOpacity
          onPress={onEdit}
          className="p-1.5"
          hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
        >
          <Pencil size={16} color="#9ca3af" />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={onDelete}
          className="p-1.5"
          hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
        >
          <Trash2 size={16} color="#9ca3af" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

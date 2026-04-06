import dayjs from "dayjs";
import { FileText, Pencil, Trash2 } from "lucide-react-native";
import { Text, TouchableOpacity, View } from "react-native";

const HIT_SLOP = { top: 10, bottom: 10, left: 10, right: 10 };

export function NoteCard({
  title,
  content,
  updatedAt,
  activityName,
  onEdit,
  onDelete,
}: {
  title: string;
  content: string;
  updatedAt: string;
  activityName: string | null;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const preview = content.length > 80 ? `${content.slice(0, 80)}...` : content;

  return (
    <View
      className="p-3.5 rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-800"
      style={{
        shadowColor: "#1c1917",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 3,
        elevation: 2,
      }}
    >
      <TouchableOpacity onPress={onEdit} activeOpacity={0.7}>
        <View className="flex-row items-center gap-2 mb-1">
          <FileText size={16} color="#9ca3af" />
          <Text
            className="text-base font-medium text-gray-900 dark:text-gray-100 flex-1"
            numberOfLines={1}
          >
            {title}
          </Text>
        </View>

        {preview.length > 0 && (
          <Text
            className="text-sm text-gray-500 dark:text-gray-400 mb-2 ml-6"
            numberOfLines={2}
          >
            {/* TODO: react-native-marked導入後にMarkdownレンダリングに置き換え */}
            {preview}
          </Text>
        )}

        <View className="flex-row items-center gap-2 ml-6">
          <Text className="text-xs text-gray-400 dark:text-gray-500">
            {dayjs(updatedAt).format("YYYY/MM/DD HH:mm")}
          </Text>
          {activityName && (
            <View className="bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded">
              <Text className="text-xs text-gray-500 dark:text-gray-400">
                {activityName}
              </Text>
            </View>
          )}
        </View>
      </TouchableOpacity>

      <View className="flex-row justify-end gap-0.5 mt-1">
        <TouchableOpacity
          onPress={onEdit}
          className="p-1.5"
          hitSlop={HIT_SLOP}
          accessibilityRole="button"
          accessibilityLabel="Edit note"
        >
          <Pencil size={16} color="#9ca3af" />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={onDelete}
          className="p-1.5"
          hitSlop={HIT_SLOP}
          accessibilityRole="button"
          accessibilityLabel="Delete note"
        >
          <Trash2 size={16} color="#9ca3af" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

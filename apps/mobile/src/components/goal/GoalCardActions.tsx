import { useTranslation } from "@packages/i18n";
import { Pencil, PlusCircle, Trash2 } from "lucide-react-native";
import { Text, TouchableOpacity, View } from "react-native";

export function GoalCardActions({
  isPast,
  isActive,
  showDeleteConfirm,
  deleting,
  onRecordOpen,
  onEditStart,
  onDeactivate,
  onDeleteConfirm,
  onDeleteCancel,
  onHandleDelete,
  onDelete,
}: {
  isPast: boolean;
  isActive: boolean;
  showDeleteConfirm: boolean;
  deleting: boolean;
  onRecordOpen?: () => void;
  onEditStart?: () => void;
  onDeactivate?: () => void;
  onDeleteConfirm: () => void;
  onDeleteCancel: () => void;
  onHandleDelete: () => void;
  onDelete?: () => Promise<void>;
}) {
  const { t } = useTranslation("goal");
  return (
    <>
      {!isPast && onRecordOpen && (
        <TouchableOpacity
          className="p-1"
          onPress={onRecordOpen}
          accessibilityRole="button"
          accessibilityLabel="活動を記録"
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <PlusCircle size={14} color="#3b82f6" />
        </TouchableOpacity>
      )}
      {!isPast && onEditStart && (
        <TouchableOpacity
          className="p-1"
          onPress={onEditStart}
          accessibilityRole="button"
          accessibilityLabel="目標を編集"
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Pencil size={14} color="#9ca3af" />
        </TouchableOpacity>
      )}
      {isPast && isActive && onDeactivate && (
        <TouchableOpacity
          className="px-2 py-0.5 bg-orange-50 rounded-full"
          onPress={onDeactivate}
        >
          <Text className="text-xs font-medium text-orange-600">
            {t("cardDeactivate")}
          </Text>
        </TouchableOpacity>
      )}
      {isPast && !showDeleteConfirm && onDelete && (
        <TouchableOpacity
          className="p-1"
          onPress={onDeleteConfirm}
          accessibilityRole="button"
          accessibilityLabel="目標を削除"
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Trash2 size={14} color="#9ca3af" />
        </TouchableOpacity>
      )}
      {isPast && showDeleteConfirm && (
        <View className="flex-row items-center gap-1">
          <TouchableOpacity
            className="px-2 py-1 bg-red-500 dark:bg-red-700 rounded"
            onPress={onHandleDelete}
            disabled={deleting}
          >
            <Text className="text-xs text-white">削除</Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded"
            onPress={onDeleteCancel}
          >
            <Text className="text-xs text-gray-600 dark:text-gray-400">
              取消
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </>
  );
}

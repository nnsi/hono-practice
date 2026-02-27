import { View, Text, TouchableOpacity } from "react-native";
import { ModalOverlay } from "../common/ModalOverlay";

export function DeleteConfirmDialog({
  taskTitle,
  onConfirm,
  onCancel,
}: {
  taskTitle: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <ModalOverlay visible onClose={onCancel} title="タスクを削除しますか？">
      <View className="gap-3 pb-4">
        <Text className="text-sm text-gray-500">
          この操作は取り消せません。タスク「{taskTitle}
          」を完全に削除します。
        </Text>
        <View className="flex-row gap-2 mt-2">
          <TouchableOpacity
            onPress={onCancel}
            className="flex-1 py-2.5 border border-gray-200 rounded-xl items-center"
          >
            <Text className="text-sm text-gray-700">キャンセル</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={onConfirm}
            className="flex-1 py-2.5 bg-red-500 rounded-xl items-center"
          >
            <Text className="text-sm text-white font-medium">削除する</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ModalOverlay>
  );
}

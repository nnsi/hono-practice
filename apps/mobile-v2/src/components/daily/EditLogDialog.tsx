import { View, Text, TextInput, TouchableOpacity } from "react-native";
import { Trash2 } from "lucide-react-native";
import { ModalOverlay } from "../common/ModalOverlay";
import { useEditLogDialog } from "./useEditLogDialog";

type Log = {
  id: string;
  activityId: string;
  activityKindId: string | null;
  quantity: number | null;
  memo: string;
  date: string;
  time: string | null;
};

type Activity = {
  id: string;
  name: string;
  emoji: string;
  quantityUnit: string;
};

export function EditLogDialog({
  log,
  activity,
  onClose,
}: {
  log: Log;
  activity: Activity | null;
  onClose: () => void;
}) {
  const {
    quantity,
    setQuantity,
    memo,
    setMemo,
    selectedKindId,
    setSelectedKindId,
    isSubmitting,
    showDeleteConfirm,
    setShowDeleteConfirm,
    kinds,
    handleSave,
    handleDelete,
  } = useEditLogDialog(log, onClose);

  return (
    <ModalOverlay
      visible
      onClose={onClose}
      title={`${activity?.emoji || "\u{1f4dd}"} ${activity?.name ?? "\u4e0d\u660e"}`}
    >
      <View className="gap-4">
        {/* Kind selector */}
        {kinds.length > 0 && (
          <View>
            <Text className="text-sm font-medium text-gray-600 mb-2">
              種類
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {kinds.map((kind) => (
                <TouchableOpacity
                  key={kind.id}
                  onPress={() =>
                    setSelectedKindId(
                      selectedKindId === kind.id ? null : kind.id,
                    )
                  }
                  className={`flex-row items-center px-3 py-1.5 rounded-full border ${
                    selectedKindId === kind.id
                      ? "bg-gray-900 border-gray-900"
                      : "bg-white border-gray-300"
                  }`}
                >
                  {kind.color && (
                    <View
                      className="w-2.5 h-2.5 rounded-full mr-1.5"
                      style={{ backgroundColor: kind.color }}
                    />
                  )}
                  <Text
                    className={`text-sm ${
                      selectedKindId === kind.id
                        ? "text-white font-medium"
                        : "text-gray-700"
                    }`}
                  >
                    {kind.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Quantity */}
        <View>
          <Text className="text-sm font-medium text-gray-600 mb-1">
            数量{activity?.quantityUnit ? ` (${activity.quantityUnit})` : ""}
          </Text>
          <TextInput
            className="border border-gray-300 rounded-lg px-3 py-2 text-lg"
            value={quantity}
            onChangeText={setQuantity}
            keyboardType="decimal-pad"
            onFocus={() => {
              // Select all on focus is not directly supported in RN TextInput
            }}
          />
        </View>

        {/* Memo */}
        <View>
          <Text className="text-sm font-medium text-gray-600 mb-1">メモ</Text>
          <TextInput
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
            value={memo}
            onChangeText={setMemo}
            placeholder="メモを入力..."
            multiline
            numberOfLines={2}
          />
        </View>

        {/* Action buttons */}
        <View className="flex-row gap-2 mb-4">
          <TouchableOpacity
            className={`flex-1 py-3 rounded-lg items-center ${
              isSubmitting ? "bg-gray-400" : "bg-gray-900"
            }`}
            onPress={handleSave}
            disabled={isSubmitting}
          >
            <Text className="text-white font-medium">保存</Text>
          </TouchableOpacity>

          {!showDeleteConfirm ? (
            <TouchableOpacity
              className="px-4 py-3 rounded-lg border border-red-300 items-center justify-center"
              onPress={() => setShowDeleteConfirm(true)}
            >
              <Trash2 size={18} color="#ef4444" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              className={`px-4 py-3 rounded-lg items-center justify-center ${
                isSubmitting ? "bg-red-300" : "bg-red-500"
              }`}
              onPress={handleDelete}
              disabled={isSubmitting}
            >
              <Text className="text-white font-medium">削除</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </ModalOverlay>
  );
}

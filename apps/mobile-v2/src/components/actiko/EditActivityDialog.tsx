import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Switch,
} from "react-native";
import { ImagePlus, ImageOff } from "lucide-react-native";
import { ModalOverlay } from "../common/ModalOverlay";
import { EmojiPicker } from "../common/EmojiPicker";
import { useEditActivityDialog } from "./useEditActivityDialog";

type Activity = {
  id: string;
  name: string;
  emoji: string;
  iconType: "emoji" | "upload" | "generate";
  quantityUnit: string;
  showCombinedStats: boolean;
};

type EditActivityDialogProps = {
  visible: boolean;
  onClose: () => void;
  activity: Activity | null;
  onUpdated: () => void;
};

export function EditActivityDialog({
  visible,
  onClose,
  activity,
  onUpdated,
}: EditActivityDialogProps) {
  const {
    name,
    setName,
    emoji,
    setEmoji,
    quantityUnit,
    setQuantityUnit,
    showCombinedStats,
    setShowCombinedStats,
    kindEntries,
    isSubmitting,
    isUploadingImage,
    currentIconType,
    showDeleteConfirm,
    setShowDeleteConfirm,
    error,
    setError,
    handlePickImage,
    handleClearImage,
    handleSave,
    handleDelete,
    addKind,
    removeKind,
    updateKindName,
  } = useEditActivityDialog(activity, onUpdated, onClose);

  if (!activity) return null;

  return (
    <ModalOverlay visible={visible} onClose={onClose} title="アクティビティ編集">
      <View className="gap-4">
        <EmojiPicker value={emoji} onChange={setEmoji} />

        {/* Image upload section */}
        <View className="flex-row gap-2">
          <TouchableOpacity
            className={`flex-1 flex-row items-center justify-center py-2.5 rounded-lg border border-gray-300 ${
              isUploadingImage ? "opacity-50" : ""
            }`}
            onPress={handlePickImage}
            disabled={isUploadingImage}
          >
            <ImagePlus size={16} color="#6b7280" />
            <Text className="ml-1.5 text-sm text-gray-700">
              {isUploadingImage ? "処理中..." : "画像を選択"}
            </Text>
          </TouchableOpacity>

          {currentIconType === "upload" ? (
            <TouchableOpacity
              className="flex-1 flex-row items-center justify-center py-2.5 rounded-lg border border-red-300"
              onPress={handleClearImage}
            >
              <ImageOff size={16} color="#ef4444" />
              <Text className="ml-1.5 text-sm text-red-500">画像を削除</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        <View>
          <Text className="text-sm text-gray-500 mb-1">名前</Text>
          <TextInput
            className="border border-gray-300 rounded-lg px-4 py-2 text-base"
            value={name}
            onChangeText={(t) => {
              setName(t);
              if (error) setError("");
            }}
          />
        </View>

        <View>
          <Text className="text-sm text-gray-500 mb-1">単位（任意）</Text>
          <TextInput
            className="border border-gray-300 rounded-lg px-4 py-2 text-base"
            value={quantityUnit}
            onChangeText={setQuantityUnit}
            placeholder="例: km, 回, 分"
          />
        </View>

        <View className="flex-row items-center justify-between py-2">
          <Text className="text-sm text-gray-700">統計を合算表示</Text>
          <Switch
            value={showCombinedStats}
            onValueChange={setShowCombinedStats}
            trackColor={{ false: "#d6d3d1", true: "#fcd34d" }}
            thumbColor={showCombinedStats ? "#f59e0b" : "#fafaf9"}
          />
        </View>

        {/* Kind management */}
        <View>
          <Text className="text-sm text-gray-500 mb-2">種類</Text>
          {kindEntries.map((kind, index) => (
            <View
              key={kind.id ?? `new-${index}`}
              className="flex-row items-center mb-2 gap-2"
            >
              <TextInput
                className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm"
                value={kind.name}
                onChangeText={(t) => updateKindName(index, t)}
                placeholder="種類名"
              />
              <View
                className="w-8 h-8 rounded"
                style={{ backgroundColor: kind.color }}
              />
              <TouchableOpacity
                onPress={() => removeKind(index)}
                className="px-2 py-1"
              >
                <Text className="text-red-500 text-base">-</Text>
              </TouchableOpacity>
            </View>
          ))}
          <TouchableOpacity onPress={addKind}>
            <Text className="text-sm text-blue-600 font-medium">
              + 種類を追加
            </Text>
          </TouchableOpacity>
        </View>

        {error ? (
          <Text className="text-red-500 text-sm">{error}</Text>
        ) : null}

        {/* Save + Delete buttons */}
        <View className="flex-row gap-2 mt-2">
          <TouchableOpacity
            className={`flex-1 py-3 rounded-xl items-center ${
              isSubmitting || !name.trim() ? "bg-gray-400" : "bg-gray-900"
            }`}
            onPress={handleSave}
            disabled={isSubmitting || !name.trim()}
          >
            <Text className="text-white font-bold text-base">
              {isSubmitting ? "保存中..." : "保存"}
            </Text>
          </TouchableOpacity>

          {!showDeleteConfirm ? (
            <TouchableOpacity
              className="px-4 py-3 rounded-xl items-center border border-red-300"
              onPress={() => setShowDeleteConfirm(true)}
            >
              <Text className="text-red-500 font-medium text-sm">削除</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              className={`px-4 py-3 rounded-xl items-center ${
                isSubmitting ? "bg-red-300" : "bg-red-500"
              }`}
              onPress={handleDelete}
              disabled={isSubmitting}
            >
              <Text className="text-white font-medium text-sm">
                本当に削除
              </Text>
            </TouchableOpacity>
          )}
        </View>

        <View className="h-4" />
      </View>
    </ModalOverlay>
  );
}

import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Switch,
} from "react-native";
import { ModalOverlay } from "../common/ModalOverlay";
import { EmojiPicker } from "../common/EmojiPicker";
import { useCreateActivityDialog } from "./useCreateActivityDialog";

type CreateActivityDialogProps = {
  visible: boolean;
  onClose: () => void;
  onCreated: () => void;
};

export function CreateActivityDialog({
  visible,
  onClose,
  onCreated,
}: CreateActivityDialogProps) {
  const {
    name,
    setName,
    emoji,
    setEmoji,
    quantityUnit,
    setQuantityUnit,
    showCombinedStats,
    setShowCombinedStats,
    kinds,
    isSubmitting,
    error,
    setError,
    handleCreate,
    handleClose,
    addKind,
    removeKind,
    updateKindName,
  } = useCreateActivityDialog(onCreated, onClose);

  return (
    <ModalOverlay visible={visible} onClose={handleClose} title="アクティビティ作成">
      <View className="gap-4">
        <EmojiPicker value={emoji} onChange={setEmoji} />

        <View>
          <Text className="text-sm text-gray-500 mb-1">名前</Text>
          <TextInput
            className="border border-gray-300 rounded-lg px-4 py-2 text-base"
            value={name}
            onChangeText={(t) => {
              setName(t);
              if (error) setError("");
            }}
            placeholder="例: ランニング"
            autoFocus
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

        {/* Kinds management */}
        <View>
          <Text className="text-sm text-gray-500 mb-2">種類</Text>
          {kinds.map((kind, index) => (
            <View
              key={index}
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

        <TouchableOpacity
          className={`mt-2 mb-4 py-3 rounded-xl items-center ${
            isSubmitting || !name.trim() ? "bg-gray-400" : "bg-gray-900"
          }`}
          onPress={handleCreate}
          disabled={isSubmitting || !name.trim()}
        >
          <Text className="text-white font-bold text-base">
            {isSubmitting ? "作成中..." : "作成"}
          </Text>
        </TouchableOpacity>
      </View>
    </ModalOverlay>
  );
}

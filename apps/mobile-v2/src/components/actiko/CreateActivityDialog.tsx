import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, Switch, Alert } from "react-native";
import { ModalOverlay } from "../common/ModalOverlay";
import { EmojiPicker } from "../common/EmojiPicker";
import { activityRepository } from "../../repositories/activityRepository";

type CreateActivityDialogProps = {
  visible: boolean;
  onClose: () => void;
};

export function CreateActivityDialog({
  visible,
  onClose,
}: CreateActivityDialogProps) {
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState("");
  const [quantityUnit, setQuantityUnit] = useState("");
  const [showCombinedStats, setShowCombinedStats] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetForm = () => {
    setName("");
    setEmoji("");
    setQuantityUnit("");
    setShowCombinedStats(false);
  };

  const handleCreate = async () => {
    if (!name.trim()) {
      Alert.alert("エラー", "名前を入力してください");
      return;
    }
    setIsSubmitting(true);
    try {
      await activityRepository.createActivity({
        name: name.trim(),
        emoji: emoji || "📝",
        quantityUnit: quantityUnit.trim(),
        showCombinedStats,
      });
      resetForm();
      onClose();
    } catch (e) {
      Alert.alert("エラー", "アクティビティの作成に失敗しました");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <ModalOverlay
      visible={visible}
      onClose={handleClose}
      title="アクティビティ作成"
    >
      <View className="gap-4">
        <EmojiPicker value={emoji} onChange={setEmoji} />

        <View>
          <Text className="text-sm text-gray-500 mb-1">名前</Text>
          <TextInput
            className="border border-gray-300 rounded-lg px-4 py-2 text-base"
            value={name}
            onChangeText={setName}
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
            trackColor={{ false: "#d1d5db", true: "#93c5fd" }}
            thumbColor={showCombinedStats ? "#3b82f6" : "#f4f4f5"}
          />
        </View>

        <TouchableOpacity
          className={`mt-2 mb-4 py-3 rounded-xl items-center ${
            isSubmitting ? "bg-blue-300" : "bg-blue-500"
          }`}
          onPress={handleCreate}
          disabled={isSubmitting}
        >
          <Text className="text-white font-bold text-base">
            {isSubmitting ? "作成中..." : "作成"}
          </Text>
        </TouchableOpacity>
      </View>
    </ModalOverlay>
  );
}

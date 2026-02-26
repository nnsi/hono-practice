import { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Switch,
  Alert,
} from "react-native";
import { Trash2, Plus, ImagePlus, ImageOff } from "lucide-react-native";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
import * as ImageManipulator from "expo-image-manipulator";
import { ModalOverlay } from "../common/ModalOverlay";
import { EmojiPicker } from "../common/EmojiPicker";
import { useActivityKinds } from "../../hooks/useActivityKinds";
import { activityRepository } from "../../repositories/activityRepository";

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
};

type KindEntry = {
  id?: string;
  name: string;
  color: string;
};

export function EditActivityDialog({
  visible,
  onClose,
  activity,
}: EditActivityDialogProps) {
  const { kinds: existingKinds } = useActivityKinds(activity?.id);
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState("");
  const [quantityUnit, setQuantityUnit] = useState("");
  const [showCombinedStats, setShowCombinedStats] = useState(false);
  const [kindEntries, setKindEntries] = useState<KindEntry[]>([]);
  const [newKindName, setNewKindName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [currentIconType, setCurrentIconType] = useState<
    "emoji" | "upload" | "generate"
  >("emoji");

  useEffect(() => {
    if (activity) {
      setName(activity.name);
      setEmoji(activity.emoji);
      setQuantityUnit(activity.quantityUnit);
      setShowCombinedStats(activity.showCombinedStats);
      setCurrentIconType(activity.iconType);
    }
  }, [activity]);

  const handlePickImage = async () => {
    if (!activity) return;
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["image/png", "image/jpeg", "image/webp"],
        copyToCacheDirectory: true,
      });

      if (result.canceled || result.assets.length === 0) return;

      setIsUploadingImage(true);
      const asset = result.assets[0];

      const manipulated = await ImageManipulator.manipulateAsync(
        asset.uri,
        [{ resize: { width: 512, height: 512 } }],
        { compress: 0.8, format: ImageManipulator.SaveFormat.PNG }
      );

      const base64 = await FileSystem.readAsStringAsync(manipulated.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      await activityRepository.saveActivityIconBlob(
        activity.id,
        base64,
        "image/png"
      );
      await activityRepository.updateActivity(activity.id, {
        iconType: "upload",
      });
      setCurrentIconType("upload");
    } catch {
      Alert.alert("エラー", "画像の選択に失敗しました");
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleClearImage = async () => {
    if (!activity) return;
    try {
      await activityRepository.clearActivityIcon(activity.id);
      setCurrentIconType("emoji");
    } catch {
      Alert.alert("エラー", "画像の削除に失敗しました");
    }
  };

  useEffect(() => {
    if (existingKinds.length > 0) {
      setKindEntries(
        existingKinds.map((k) => ({
          id: k.id,
          name: k.name,
          color: k.color || "",
        }))
      );
    }
  }, [existingKinds]);

  const handleSave = async () => {
    if (!activity) return;
    if (!name.trim()) {
      Alert.alert("エラー", "名前を入力してください");
      return;
    }
    setIsSubmitting(true);
    try {
      await activityRepository.updateActivity(
        activity.id,
        {
          name: name.trim(),
          emoji: emoji || "📝",
          quantityUnit: quantityUnit.trim(),
          showCombinedStats,
        },
        kindEntries
      );
      onClose();
    } catch (e) {
      Alert.alert("エラー", "更新に失敗しました");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = () => {
    if (!activity) return;
    Alert.alert("削除確認", `「${activity.name}」を削除しますか？`, [
      { text: "キャンセル", style: "cancel" },
      {
        text: "削除",
        style: "destructive",
        onPress: async () => {
          await activityRepository.softDeleteActivity(activity.id);
          onClose();
        },
      },
    ]);
  };

  const addKind = () => {
    if (!newKindName.trim()) return;
    setKindEntries((prev) => [
      ...prev,
      { name: newKindName.trim(), color: "" },
    ]);
    setNewKindName("");
  };

  const removeKind = (index: number) => {
    setKindEntries((prev) => prev.filter((_, i) => i !== index));
  };

  if (!activity) return null;

  return (
    <ModalOverlay
      visible={visible}
      onClose={onClose}
      title="アクティビティ編集"
    >
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
            onChangeText={setName}
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

        {/* Kind management */}
        <View>
          <Text className="text-sm text-gray-500 mb-2">種別</Text>
          {kindEntries.map((kind, index) => (
            <View
              key={kind.id ?? `new-${index}`}
              className="flex-row items-center mb-2"
            >
              <TextInput
                className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm"
                value={kind.name}
                onChangeText={(text) =>
                  setKindEntries((prev) =>
                    prev.map((k, i) =>
                      i === index ? { ...k, name: text } : k
                    )
                  )
                }
              />
              <TouchableOpacity
                onPress={() => removeKind(index)}
                className="ml-2 p-1.5"
              >
                <Trash2 size={16} color="#ef4444" />
              </TouchableOpacity>
            </View>
          ))}
          <View className="flex-row items-center">
            <TextInput
              className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm"
              value={newKindName}
              onChangeText={setNewKindName}
              placeholder="種別を追加..."
              onSubmitEditing={addKind}
            />
            <TouchableOpacity onPress={addKind} className="ml-2 p-1.5">
              <Plus size={16} color="#3b82f6" />
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity
          className={`mt-2 py-3 rounded-xl items-center ${
            isSubmitting ? "bg-blue-300" : "bg-blue-500"
          }`}
          onPress={handleSave}
          disabled={isSubmitting}
        >
          <Text className="text-white font-bold text-base">
            {isSubmitting ? "保存中..." : "保存"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          className="mb-4 py-3 rounded-xl items-center border border-red-300"
          onPress={handleDelete}
        >
          <Text className="text-red-500 font-medium text-base">削除</Text>
        </TouchableOpacity>
      </View>
    </ModalOverlay>
  );
}

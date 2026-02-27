import { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Switch,
} from "react-native";
import { ImagePlus, ImageOff } from "lucide-react-native";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
import * as ImageManipulator from "expo-image-manipulator";
import { ModalOverlay } from "../common/ModalOverlay";
import { EmojiPicker } from "../common/EmojiPicker";
import { useActivityKinds } from "../../hooks/useActivityKinds";
import { activityRepository } from "../../repositories/activityRepository";
import { COLOR_PALETTE } from "../stats/colorUtils";

type Activity = {
  id: string;
  name: string;
  emoji: string;
  iconType: "emoji" | "upload" | "generate";
  quantityUnit: string;
  showCombinedStats: boolean;
};

type KindEntry = {
  id?: string;
  name: string;
  color: string;
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
  const { kinds: existingKinds } = useActivityKinds(activity?.id);
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState("");
  const [quantityUnit, setQuantityUnit] = useState("");
  const [showCombinedStats, setShowCombinedStats] = useState(false);
  const [kindEntries, setKindEntries] = useState<KindEntry[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [currentIconType, setCurrentIconType] = useState<
    "emoji" | "upload" | "generate"
  >("emoji");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (activity) {
      setName(activity.name);
      setEmoji(activity.emoji);
      setQuantityUnit(activity.quantityUnit);
      setShowCombinedStats(activity.showCombinedStats);
      setCurrentIconType(activity.iconType);
      setShowDeleteConfirm(false);
      setError("");
    }
  }, [activity]);

  useEffect(() => {
    if (existingKinds.length > 0) {
      setKindEntries(
        existingKinds.map((k) => ({
          id: k.id,
          name: k.name,
          color: k.color || "#3b82f6",
        }))
      );
    }
  }, [existingKinds]);

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
      setError("画像の選択に失敗しました");
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
      setError("画像の削除に失敗しました");
    }
  };

  const handleSave = async () => {
    if (!activity) return;
    if (!name.trim()) {
      setError("名前を入力してください");
      return;
    }
    setIsSubmitting(true);
    setError("");
    try {
      await activityRepository.updateActivity(
        activity.id,
        {
          name: name.trim(),
          emoji: emoji || "\ud83d\udcdd",
          quantityUnit: quantityUnit.trim(),
          showCombinedStats,
        },
        kindEntries.filter((k) => k.name.trim())
      );
      onUpdated();
      onClose();
    } catch {
      setError("更新に失敗しました");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!activity) return;
    setIsSubmitting(true);
    try {
      await activityRepository.softDeleteActivity(activity.id);
      onUpdated();
      onClose();
    } catch {
      setError("削除に失敗しました");
    } finally {
      setIsSubmitting(false);
    }
  };

  const addKind = () => {
    setKindEntries((prev) => {
      const usedColors = new Set(prev.map((k) => k.color.toUpperCase()));
      const nextColor =
        COLOR_PALETTE.find((c) => !usedColors.has(c.toUpperCase())) ??
        COLOR_PALETTE[prev.length % COLOR_PALETTE.length];
      return [...prev, { name: "", color: nextColor }];
    });
  };

  const removeKind = (index: number) => {
    setKindEntries((prev) => prev.filter((_, i) => i !== index));
  };

  const updateKindName = (index: number, text: string) => {
    setKindEntries((prev) =>
      prev.map((k, i) => (i === index ? { ...k, name: text } : k))
    );
  };

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

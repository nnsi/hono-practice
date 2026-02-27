import { useState, useEffect } from "react";
import * as DocumentPicker from "expo-document-picker";
import { readAsStringAsync, EncodingType } from "expo-file-system/legacy";
import * as ImageManipulator from "expo-image-manipulator";
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

export function useEditActivityDialog(
  activity: Activity | null,
  onUpdated: () => void,
  onClose: () => void,
) {
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

  // sync state when activity changes
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

  // sync kinds when loaded
  useEffect(() => {
    if (existingKinds.length > 0) {
      setKindEntries(
        existingKinds.map((k) => ({
          id: k.id,
          name: k.name,
          color: k.color || "#3b82f6",
        })),
      );
    }
  }, [existingKinds]);

  // handlers
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
        { compress: 0.8, format: ImageManipulator.SaveFormat.PNG },
      );

      const base64 = await readAsStringAsync(manipulated.uri, {
        encoding: EncodingType.Base64,
      });

      await activityRepository.saveActivityIconBlob(
        activity.id,
        base64,
        "image/png",
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
        kindEntries.filter((k) => k.name.trim()),
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
      prev.map((k, i) => (i === index ? { ...k, name: text } : k)),
    );
  };

  return {
    // form state
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
    // handlers
    handlePickImage,
    handleClearImage,
    handleSave,
    handleDelete,
    addKind,
    removeKind,
    updateKindName,
  };
}

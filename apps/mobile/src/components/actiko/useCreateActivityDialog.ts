import { useState } from "react";

import type { RecordingMode } from "@packages/domain/activity/recordingMode";
import { COLOR_PALETTE } from "@packages/frontend-shared/utils/colorUtils";
import * as DocumentPicker from "expo-document-picker";
import { EncodingType, readAsStringAsync } from "expo-file-system/legacy";
import * as ImageManipulator from "expo-image-manipulator";

import { activityRepository } from "../../repositories/activityRepository";

type KindEntry = {
  id: number;
  name: string;
  color: string;
};

export function useCreateActivityDialog(
  onCreated: () => void,
  onClose: () => void,
) {
  // state
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState("");
  const [quantityUnit, setQuantityUnit] = useState("");
  const [showCombinedStats, setShowCombinedStats] = useState(false);
  const [kinds, setKinds] = useState<KindEntry[]>([]);
  const [nextKindId, setNextKindId] = useState(0);
  const [recordingMode, setRecordingMode] = useState<RecordingMode>("manual");
  const [recordingModeConfig, setRecordingModeConfig] = useState<string | null>(
    null,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [iconType, setIconType] = useState<"emoji" | "upload">("emoji");
  const [pendingImage, setPendingImage] = useState<{
    base64: string;
    mimeType: string;
  } | null>(null);
  const [isPickingImage, setIsPickingImage] = useState(false);

  // handlers
  const resetForm = () => {
    setName("");
    setEmoji("");
    setQuantityUnit("");
    setShowCombinedStats(false);
    setRecordingMode("manual");
    setRecordingModeConfig(null);
    setKinds([]);
    setNextKindId(0);
    setError("");
    setIconType("emoji");
    setPendingImage(null);
  };

  const handlePickImage = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["image/png", "image/jpeg", "image/webp"],
        copyToCacheDirectory: true,
      });
      if (result.canceled || result.assets.length === 0) return;

      setIsPickingImage(true);
      const asset = result.assets[0];
      const manipulated = await ImageManipulator.manipulateAsync(
        asset.uri,
        [{ resize: { width: 512, height: 512 } }],
        { compress: 0.8, format: ImageManipulator.SaveFormat.PNG },
      );
      const base64 = await readAsStringAsync(manipulated.uri, {
        encoding: EncodingType.Base64,
      });
      setPendingImage({ base64, mimeType: "image/png" });
      setIconType("upload");
    } catch {
      setError("画像の選択に失敗しました");
    } finally {
      setIsPickingImage(false);
    }
  };

  const handleClearImage = () => {
    setPendingImage(null);
    setIconType("emoji");
  };

  const handleCreate = async () => {
    if (!name.trim()) {
      setError("名前を入力してください");
      return;
    }
    setIsSubmitting(true);
    setError("");
    try {
      const activity = await activityRepository.createActivity({
        name: name.trim(),
        emoji: emoji || "\ud83d\udcdd",
        quantityUnit: quantityUnit.trim(),
        showCombinedStats,
        iconType,
        recordingMode,
        recordingModeConfig,
        kinds: kinds.filter((k) => k.name.trim()),
      });
      if (iconType === "upload" && pendingImage) {
        await activityRepository.saveActivityIconBlob(
          activity.id,
          pendingImage.base64,
          pendingImage.mimeType,
        );
      }
      resetForm();
      onCreated();
      onClose();
    } catch {
      setError("アクティビティの作成に失敗しました");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const addKind = () => {
    setKinds((prev) => {
      const usedColors = new Set(prev.map((k) => k.color.toUpperCase()));
      const nextColor =
        COLOR_PALETTE.find((c) => !usedColors.has(c.toUpperCase())) ??
        COLOR_PALETTE[prev.length % COLOR_PALETTE.length];
      return [...prev, { id: nextKindId, name: "", color: nextColor }];
    });
    setNextKindId((n) => n + 1);
  };

  const removeKind = (id: number) => {
    setKinds((prev) => prev.filter((k) => k.id !== id));
  };

  const updateKindName = (id: number, text: string) => {
    setKinds((prev) =>
      prev.map((k) => (k.id === id ? { ...k, name: text } : k)),
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
    kinds,
    recordingMode,
    setRecordingMode,
    recordingModeConfig,
    setRecordingModeConfig,
    isSubmitting,
    error,
    setError,
    iconType,
    pendingImage,
    isPickingImage,
    // handlers
    handleCreate,
    handleClose,
    handlePickImage,
    handleClearImage,
    addKind,
    removeKind,
    updateKindName,
  };
}

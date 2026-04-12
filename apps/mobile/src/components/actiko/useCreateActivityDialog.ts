import { useCallback, useState } from "react";

import type { RecordingMode } from "@packages/domain/activity/recordingMode";
import { createUseActivityKindEntries } from "@packages/frontend-shared/hooks/useActivityKindEntries";
import { EncodingType, readAsStringAsync } from "expo-file-system/legacy";
import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";

import { activityRepository } from "../../repositories/activityRepository";
import { syncEngine } from "../../sync/syncEngine";

const useActivityKindEntries = createUseActivityKindEntries({
  react: { useState, useCallback },
});

export function useCreateActivityDialog(
  onCreated: () => void,
  onClose: () => void,
) {
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState("");
  const [quantityUnit, setQuantityUnit] = useState("");
  const [showCombinedStats, setShowCombinedStats] = useState(false);
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

  const {
    kinds,
    setKinds,
    addKind,
    removeKind,
    updateKindName,
    updateKindColor,
  } = useActivityKindEntries();

  const resetForm = () => {
    setName("");
    setEmoji("");
    setQuantityUnit("");
    setShowCombinedStats(false);
    setRecordingMode("manual");
    setRecordingModeConfig(null);
    setKinds([]);
    setError("");
    setIconType("emoji");
    setPendingImage(null);
  };

  const handlePickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
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
      syncEngine.syncAll();
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

  return {
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
    handleCreate,
    handleClose,
    handlePickImage,
    handleClearImage,
    addKind,
    removeKind,
    updateKindName,
    updateKindColor,
  };
}

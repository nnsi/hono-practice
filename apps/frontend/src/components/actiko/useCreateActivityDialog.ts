import { useState } from "react";

import type { RecordingMode } from "@packages/domain/activity/recordingMode";

import { activityRepository } from "../../db/activityRepository";
import { syncEngine } from "../../sync/syncEngine";
import { resizeImage } from "../../utils/imageResizer";
import type { IconSelectorValue } from "./IconTypeSelector";

export function useCreateActivityDialog(
  onCreated: () => void,
  onClose: () => void,
) {
  // state
  const [name, setName] = useState("");
  const [quantityUnit, setQuantityUnit] = useState("");
  const [showCombinedStats, setShowCombinedStats] = useState(false);
  const [kinds, setKinds] = useState<
    { id: number; name: string; color: string }[]
  >([]);
  const [nextKindId, setNextKindId] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [icon, setIcon] = useState<IconSelectorValue>({
    type: "emoji",
    emoji: "🎯",
  });
  const [recordingMode, setRecordingMode] = useState<RecordingMode>("manual");
  const [recordingModeConfig, setRecordingModeConfig] = useState<string | null>(
    null,
  );

  // handlers
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!name.trim()) return;
    setIsSubmitting(true);

    try {
      const activity = await activityRepository.createActivity({
        name: name.trim(),
        quantityUnit,
        emoji: icon.emoji,
        showCombinedStats,
        iconType: icon.type,
        kinds: kinds.filter((k) => k.name.trim()),
        recordingMode,
        recordingModeConfig,
      });

      if (icon.type === "upload" && icon.file) {
        const { base64, mimeType } = await resizeImage(icon.file, 256, 256);
        await activityRepository.saveActivityIconBlob(
          activity.id,
          base64,
          mimeType,
        );
      }

      syncEngine.syncAll();
      onCreated();
      onClose();
    } catch (err) {
      console.error("Failed to create activity:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    // form state
    name,
    setName,
    quantityUnit,
    setQuantityUnit,
    showCombinedStats,
    setShowCombinedStats,
    kinds,
    setKinds,
    nextKindId,
    setNextKindId,
    icon,
    setIcon,
    recordingMode,
    setRecordingMode,
    recordingModeConfig,
    setRecordingModeConfig,
    isSubmitting,
    // handlers
    handleSubmit,
  };
}

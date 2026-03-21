import { useEffect, useState } from "react";

import type { RecordingMode } from "@packages/domain/activity/recordingMode";
import { COLOR_PALETTE } from "@packages/frontend-shared/utils/colorUtils";

import { useActivityKinds } from "../../hooks/useActivityKinds";
import { activityRepository } from "../../repositories/activityRepository";
import { useActivityIconPicker } from "./useActivityIconPicker";

type Activity = {
  id: string;
  name: string;
  emoji: string;
  iconType: "emoji" | "upload" | "generate";
  quantityUnit: string;
  showCombinedStats: boolean;
  recordingMode?: RecordingMode;
  recordingModeConfig?: string | null;
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
  const [recordingMode, setRecordingMode] = useState<RecordingMode>("manual");
  const [recordingModeConfig, setRecordingModeConfig] = useState<string | null>(
    null,
  );
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [error, setError] = useState("");

  const iconPicker = useActivityIconPicker(activity);

  useEffect(() => {
    if (activity) {
      setName(activity.name);
      setEmoji(activity.emoji);
      setQuantityUnit(activity.quantityUnit);
      setShowCombinedStats(activity.showCombinedStats);
      setRecordingMode(activity.recordingMode ?? "manual");
      setRecordingModeConfig(activity.recordingModeConfig ?? null);
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
        })),
      );
    }
  }, [existingKinds]);

  const handleSave = async () => {
    if (!activity) return;
    if (!name.trim()) {
      setError("名前を入力してください");
      return;
    }
    setIsSubmitting(true);
    setError("");
    try {
      const changes = {
        name: name.trim(),
        emoji: emoji || "\ud83d\udcdd",
        quantityUnit: quantityUnit.trim(),
        showCombinedStats,
        recordingMode,
        recordingModeConfig,
      };
      await activityRepository.updateActivity(
        activity.id,
        changes,
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

  const updateKindColor = (index: number, color: string) => {
    setKindEntries((prev) =>
      prev.map((k, i) => (i === index ? { ...k, color } : k)),
    );
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
    recordingMode,
    setRecordingMode,
    recordingModeConfig,
    setRecordingModeConfig,
    kindEntries,
    isSubmitting,
    showDeleteConfirm,
    setShowDeleteConfirm,
    error,
    setError,
    ...iconPicker,
    handleSave,
    handleDelete,
    addKind,
    removeKind,
    updateKindName,
    updateKindColor,
  };
}

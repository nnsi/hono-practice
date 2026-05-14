import { useCallback, useEffect, useState } from "react";

import type { RecordingMode } from "@packages/domain/activity/recordingMode";
import { createUseActivityKindEntries } from "@packages/frontend-shared/hooks/useActivityKindEntries";

import { useActivityKinds } from "../../hooks/useActivityKinds";
import { activityRepository } from "../../repositories/activityRepository";
import { syncEngine } from "../../sync/syncEngine";
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

const useActivityKindEntries = createUseActivityKindEntries({
  react: { useState, useCallback },
});

export function useEditActivityDialog(
  activity: Activity | null,
  onUpdated: () => void,
  onClose: () => void,
) {
  const { kinds: existingKinds } = useActivityKinds(activity?.id);
  const [name, setName] = useState(() => activity?.name ?? "");
  const [emoji, setEmoji] = useState(() => activity?.emoji ?? "");
  const [quantityUnit, setQuantityUnit] = useState(
    () => activity?.quantityUnit ?? "",
  );
  const [showCombinedStats, setShowCombinedStats] = useState(
    () => activity?.showCombinedStats ?? false,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [recordingMode, setRecordingMode] = useState<RecordingMode>(
    () => activity?.recordingMode ?? "manual",
  );
  const [recordingModeConfig, setRecordingModeConfig] = useState<string | null>(
    () => activity?.recordingModeConfig ?? null,
  );
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [error, setError] = useState("");

  const iconPicker = useActivityIconPicker(activity);
  const {
    kinds: kindEntries,
    setKinds: setKindEntries,
    addKind,
    removeKind,
    updateKindName,
    updateKindColor,
  } = useActivityKindEntries();

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
  }, [existingKinds, setKindEntries]);

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
        kindEntries
          .filter((k) => k.name.trim())
          .map((k) => ({
            id: typeof k.id === "string" ? k.id : undefined,
            name: k.name,
            color: k.color,
          })),
      );
      syncEngine.syncAll();
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
      syncEngine.syncActivities();
      onUpdated();
      onClose();
    } catch {
      setError("削除に失敗しました");
    } finally {
      setIsSubmitting(false);
    }
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

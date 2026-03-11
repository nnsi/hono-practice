import { useState } from "react";

import { COLOR_PALETTE } from "@packages/frontend-shared/utils/colorUtils";

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
  const [recordingMode, setRecordingMode] = useState("manual");
  const [recordingModeConfig, setRecordingModeConfig] = useState<string | null>(
    null,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

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
  };

  const handleCreate = async () => {
    if (!name.trim()) {
      setError("名前を入力してください");
      return;
    }
    setIsSubmitting(true);
    setError("");
    try {
      await activityRepository.createActivity({
        name: name.trim(),
        emoji: emoji || "\ud83d\udcdd",
        quantityUnit: quantityUnit.trim(),
        showCombinedStats,
        recordingMode,
        recordingModeConfig,
        kinds: kinds.filter((k) => k.name.trim()),
      });
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
    // handlers
    handleCreate,
    handleClose,
    addKind,
    removeKind,
    updateKindName,
  };
}

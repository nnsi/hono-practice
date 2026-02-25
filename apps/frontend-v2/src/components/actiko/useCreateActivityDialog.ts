import { useState } from "react";
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
  const [kinds, setKinds] = useState<{ name: string; color: string }[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [icon, setIcon] = useState<IconSelectorValue>({
    type: "emoji",
    emoji: "🎯",
  });

  // handlers
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!name.trim()) return;
    setIsSubmitting(true);

    const activity = await activityRepository.createActivity({
      name: name.trim(),
      quantityUnit,
      emoji: icon.emoji,
      showCombinedStats,
      iconType: icon.type,
      kinds: kinds.filter((k) => k.name.trim()),
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
    setIsSubmitting(false);
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
    icon,
    setIcon,
    isSubmitting,
    // handlers
    handleSubmit,
  };
}

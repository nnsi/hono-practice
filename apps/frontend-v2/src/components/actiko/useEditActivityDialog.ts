import { useEffect, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { useActivityKinds } from "../../hooks/useActivityKinds";
import { activityRepository } from "../../db/activityRepository";
import { syncEngine } from "../../sync/syncEngine";
import { resizeImage } from "../../utils/imageResizer";
import type { DexieActivity } from "../../db/schema";
import { db } from "../../db/schema";
import type { IconSelectorValue } from "./IconTypeSelector";

export function useEditActivityDialog(
  activity: DexieActivity,
  onUpdated: () => void,
  onClose: () => void,
) {
  // state
  const [name, setName] = useState(activity.name);
  const [quantityUnit, setQuantityUnit] = useState(activity.quantityUnit);
  const [showCombinedStats, setShowCombinedStats] = useState(
    activity.showCombinedStats,
  );
  const { kinds: existingKinds } = useActivityKinds(activity.id);
  const [kinds, setKinds] = useState<
    { id?: string; name: string; color: string }[]
  >([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [iconChanged, setIconChanged] = useState(false);

  // data
  const existingBlob = useLiveQuery(
    () => db.activityIconBlobs.get(activity.id),
    [activity.id],
  );

  // computed
  const buildInitialPreview = () => {
    if (existingBlob) {
      return `data:${existingBlob.mimeType};base64,${existingBlob.base64}`;
    }
    if (
      activity.iconType === "upload" &&
      (activity.iconThumbnailUrl || activity.iconUrl)
    ) {
      return activity.iconThumbnailUrl || activity.iconUrl || undefined;
    }
    return undefined;
  };

  const [icon, setIcon] = useState<IconSelectorValue>({
    type: activity.iconType === "upload" ? "upload" : "emoji",
    emoji: activity.emoji,
    preview: buildInitialPreview(),
  });

  // existingBlobが後から読み込まれた場合にpreviewを更新
  useEffect(() => {
    if (existingBlob && !icon.file && icon.type === "upload" && !icon.preview) {
      setIcon((prev) => ({
        ...prev,
        preview: `data:${existingBlob.mimeType};base64,${existingBlob.base64}`,
      }));
    }
  }, [existingBlob, icon.file, icon.type, icon.preview]);

  // existingKindsが読み込まれたら初期化
  useEffect(() => {
    if (existingKinds.length > 0) {
      setKinds(
        existingKinds.map((k) => ({
          id: k.id,
          name: k.name,
          color: k.color || "#3b82f6",
        })),
      );
    }
  }, [existingKinds]);

  // handlers
  const handleIconChange = (newIcon: IconSelectorValue) => {
    setIcon(newIcon);
    setIconChanged(true);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!name.trim()) return;
    setIsSubmitting(true);

    await activityRepository.updateActivity(
      activity.id,
      {
        name: name.trim(),
        quantityUnit,
        emoji: icon.emoji,
        showCombinedStats,
        iconType: icon.type,
      },
      kinds
        .filter((k) => k.name.trim())
        .map((k) => ({
          id: k.id,
          name: k.name,
          color: k.color,
        })),
    );

    if (iconChanged) {
      if (icon.type === "upload" && icon.file) {
        const { base64, mimeType } = await resizeImage(icon.file, 256, 256);
        await activityRepository.saveActivityIconBlob(
          activity.id,
          base64,
          mimeType,
        );
      } else if (icon.type === "emoji" && activity.iconType === "upload") {
        await activityRepository.clearActivityIcon(activity.id);
      }
    }

    syncEngine.syncActivities();
    onUpdated();
    onClose();
    setIsSubmitting(false);
  };

  const handleDelete = async () => {
    setIsSubmitting(true);
    await activityRepository.softDeleteActivity(activity.id);
    syncEngine.syncActivities();
    onUpdated();
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
    isSubmitting,
    showDeleteConfirm,
    setShowDeleteConfirm,
    // handlers
    handleIconChange,
    handleSubmit,
    handleDelete,
  };
}

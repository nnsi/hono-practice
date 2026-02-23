import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { useLiveQuery } from "dexie-react-hooks";
import { useActivityKinds } from "../../hooks/useActivityKinds";
import { activityRepository } from "../../db/activityRepository";
import { syncEngine } from "../../sync/syncEngine";
import { resizeImage } from "../../utils/imageResizer";
import type { DexieActivity } from "../../db/schema";
import { db } from "../../db/schema";
import {
  IconTypeSelector,
  type IconSelectorValue,
} from "./IconTypeSelector";

export function EditActivityDialog({
  activity,
  onClose,
  onUpdated,
}: {
  activity: DexieActivity;
  onClose: () => void;
  onUpdated: () => void;
}) {
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

  // 既存のローカルblob取得
  const existingBlob = useLiveQuery(
    () => db.activityIconBlobs.get(activity.id),
    [activity.id],
  );

  // アイコン初期値を構築
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

  const handleIconChange = (newIcon: IconSelectorValue) => {
    setIcon(newIcon);
    setIconChanged(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
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

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50">
      <div className="bg-white w-full sm:max-w-md sm:rounded-xl rounded-t-xl p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">アクティビティ編集</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* アイコン */}
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">
              アイコン
            </label>
            <IconTypeSelector
              value={icon}
              onChange={handleIconChange}
              disabled={isSubmitting}
            />
          </div>

          {/* 名前 */}
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">
              名前
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* 単位 */}
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">
              単位
            </label>
            <input
              type="text"
              value={quantityUnit}
              onChange={(e) => setQuantityUnit(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="回, 分, km など"
            />
          </div>

          {/* 合算統計 */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showCombinedStats}
              onChange={(e) => setShowCombinedStats(e.target.checked)}
              className="h-5 w-5 rounded accent-blue-600"
            />
            <span className="text-sm">合算統計を表示</span>
          </label>

          {/* 種類 */}
          <div>
            <div className="text-sm font-medium text-gray-600 mb-2">種類</div>
            {kinds.map((kind, i) => (
              <div
                key={kind.id ?? i}
                className="flex gap-2 mb-2 items-center"
              >
                <input
                  type="text"
                  value={kind.name}
                  onChange={(e) =>
                    setKinds((prev) =>
                      prev.map((k, j) =>
                        j === i ? { ...k, name: e.target.value } : k,
                      ),
                    )
                  }
                  placeholder="種類名"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="color"
                  value={kind.color || "#3b82f6"}
                  onChange={(e) =>
                    setKinds((prev) =>
                      prev.map((k, j) =>
                        j === i ? { ...k, color: e.target.value } : k,
                      ),
                    )
                  }
                  className="w-10 h-10 p-0.5 border border-gray-300 rounded cursor-pointer"
                />
                <button
                  type="button"
                  onClick={() =>
                    setKinds((prev) => prev.filter((_, j) => j !== i))
                  }
                  className="px-2 py-1 text-red-500 hover:bg-red-50 rounded"
                >
                  -
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() =>
                setKinds((prev) => [...prev, { name: "", color: "#3b82f6" }])
              }
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              + 種類を追加
            </button>
          </div>

          {/* ボタン */}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={isSubmitting || !name.trim()}
              className="flex-1 py-3 bg-black text-white rounded-lg font-medium hover:bg-gray-800 disabled:opacity-50 transition-colors"
            >
              保存
            </button>
            {!showDeleteConfirm ? (
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="px-4 py-3 border border-red-300 text-red-500 rounded-lg hover:bg-red-50 transition-colors text-sm"
              >
                削除
              </button>
            ) : (
              <button
                type="button"
                onClick={handleDelete}
                disabled={isSubmitting}
                className="px-4 py-3 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 disabled:opacity-50 transition-colors text-sm"
              >
                本当に削除
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}

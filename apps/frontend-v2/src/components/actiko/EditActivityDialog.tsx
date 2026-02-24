import { X } from "lucide-react";
import { ModalOverlay } from "../common/ModalOverlay";
import { COLOR_PALETTE } from "../stats/colorUtils";
import type { DexieActivity } from "../../db/schema";
import { IconTypeSelector } from "./IconTypeSelector";
import { useEditActivityDialog } from "./useEditActivityDialog";

export function EditActivityDialog({
  activity,
  onClose,
  onUpdated,
}: {
  activity: DexieActivity;
  onClose: () => void;
  onUpdated: () => void;
}) {
  const {
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
    handleIconChange,
    handleSubmit,
    handleDelete,
  } = useEditActivityDialog(activity, onUpdated, onClose);

  return (
    <ModalOverlay onClose={onClose}>
      <div className="bg-white w-full max-w-md rounded-2xl shadow-modal p-6 max-h-[90vh] overflow-y-auto">
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
                setKinds((prev) => {
                  const usedColors = new Set(prev.map((k) => k.color.toUpperCase()));
                  const nextColor = COLOR_PALETTE.find((c) => !usedColors.has(c.toUpperCase())) ?? COLOR_PALETTE[prev.length % COLOR_PALETTE.length];
                  return [...prev, { name: "", color: nextColor }];
                })
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
    </ModalOverlay>
  );
}

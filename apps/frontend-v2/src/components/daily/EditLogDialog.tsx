import { Trash2, X } from "lucide-react";

import type { DexieActivity, DexieActivityLog } from "../../db/schema";
import { ModalOverlay } from "../common/ModalOverlay";
import { useEditLogDialog } from "./useEditLogDialog";

export function EditLogDialog({
  log,
  activity,
  onClose,
}: {
  log: DexieActivityLog;
  activity: DexieActivity | null;
  onClose: () => void;
}) {
  const {
    quantity,
    setQuantity,
    memo,
    setMemo,
    selectedKindId,
    setSelectedKindId,
    isSubmitting,
    showDeleteConfirm,
    setShowDeleteConfirm,
    kinds,
    handleSave,
    handleDelete,
  } = useEditLogDialog(log, onClose);

  return (
    <ModalOverlay onClose={onClose}>
      <div className="bg-white w-full max-w-md rounded-2xl shadow-modal p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <span className="text-2xl">{activity?.emoji || "📝"}</span>
            {activity?.name ?? "不明"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          {/* 種類選択 */}
          {kinds.length > 0 && (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-600">
                種類
              </label>
              <div className="flex flex-wrap gap-2">
                {kinds.map((kind) => (
                  <button
                    key={kind.id}
                    type="button"
                    onClick={() =>
                      setSelectedKindId(
                        selectedKindId === kind.id ? null : kind.id,
                      )
                    }
                    className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                      selectedKindId === kind.id
                        ? "bg-black text-white border-black"
                        : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    {kind.color && (
                      <span
                        className="inline-block w-2.5 h-2.5 rounded-full mr-1.5"
                        style={{ backgroundColor: kind.color }}
                      />
                    )}
                    {kind.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 数量入力 */}
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">
              数量 {activity?.quantityUnit && `(${activity.quantityUnit})`}
            </label>
            <input
              type="number"
              inputMode="decimal"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              onFocus={(e) => e.target.select()}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              min="0"
              step="any"
            />
          </div>

          {/* メモ */}
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">
              メモ
            </label>
            <textarea
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              placeholder="メモを入力..."
            />
          </div>

          {/* アクションボタン */}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-3 bg-black text-white rounded-lg font-medium hover:bg-gray-800 disabled:opacity-50 transition-colors"
            >
              保存
            </button>
            {!showDeleteConfirm ? (
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="px-4 py-3 border border-red-300 text-red-500 rounded-lg hover:bg-red-50 transition-colors"
              >
                <Trash2 size={18} />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleDelete}
                disabled={isSubmitting}
                className="px-4 py-3 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 disabled:opacity-50 transition-colors"
              >
                削除
              </button>
            )}
          </div>
        </form>
      </div>
    </ModalOverlay>
  );
}

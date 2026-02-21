import { useState } from "react";
import { apiFetch } from "../../utils/apiClient";

export function CreateActivityDialog({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [quantityUnit, setQuantityUnit] = useState("");
  const [emoji, setEmoji] = useState("🎯");
  const [showCombinedStats, setShowCombinedStats] = useState(false);
  const [kinds, setKinds] = useState<{ name: string; color: string }[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setIsSubmitting(true);

    const res = await apiFetch("/users/activities", {
      method: "POST",
      body: JSON.stringify({
        name: name.trim(),
        quantityUnit,
        emoji,
        iconType: "emoji",
        showCombinedStats,
        kinds: kinds.filter((k) => k.name.trim()),
      }),
    });

    if (res.ok) {
      await onCreated();
      onClose();
    }
    setIsSubmitting(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50">
      <div className="bg-white w-full sm:max-w-md sm:rounded-xl rounded-t-xl p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">新規アクティビティ</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl"
          >
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 絵文字 */}
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">
              絵文字
            </label>
            <input
              type="text"
              value={emoji}
              onChange={(e) => setEmoji(e.target.value)}
              className="w-20 px-3 py-2 border border-gray-300 rounded-lg text-2xl text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              placeholder="アクティビティ名"
              autoFocus
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
              <div key={i} className="flex gap-2 mb-2 items-center">
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
              onClick={() => setKinds((prev) => [...prev, { name: "", color: "#3b82f6" }])}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              + 種類を追加
            </button>
          </div>

          <button
            type="submit"
            disabled={isSubmitting || !name.trim()}
            className="w-full py-3 bg-black text-white rounded-lg font-medium hover:bg-gray-800 disabled:opacity-50 transition-colors"
          >
            作成
          </button>
        </form>
      </div>
    </div>
  );
}

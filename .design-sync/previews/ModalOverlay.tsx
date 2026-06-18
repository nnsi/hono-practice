import { ModalOverlay } from "actiko-frontend";
import { X } from "lucide-react";

// 全画面の半透明バックドロップ + 中央寄せの共通モーダルラッパー。
// 中身は呼び出し側が渡す。ここでは典型的なダイアログ本文を入れて
// 開いた状態を描画する（onClose は no-op）。
const noop = () => {};

export function Dialog() {
  return (
    <ModalOverlay onClose={noop}>
      <div className="bg-white w-full max-w-sm rounded-2xl shadow-modal p-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold">活動を編集</h2>
          <button
            type="button"
            aria-label="Close"
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>
        <p className="text-sm text-gray-600 mb-5">
          活動名やアイコン、記録方法を変更できます。変更内容はすぐに保存されます。
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            className="flex-1 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-xl"
          >
            キャンセル
          </button>
          <button
            type="button"
            className="flex-1 py-2 text-sm font-medium text-white bg-gray-900 rounded-xl"
          >
            保存
          </button>
        </div>
      </div>
    </ModalOverlay>
  );
}

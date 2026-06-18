import { EmojiPicker } from "actiko-frontend";

// 絵文字ピッカー。children をトリガーとして受け取り、クリックで
// emoji-mart のパレットを開く。静的描画ではトリガー（閉じた状態）を見せる。
// アクティビティ作成フォームでの「アイコン選択ボタン」の見た目を再現する。
const noop = () => {};

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{ width: 260 }}
      className="bg-white rounded-2xl border border-gray-200 shadow-soft p-4"
    >
      {children}
    </div>
  );
}

export function Trigger() {
  return (
    <Frame>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        アイコン
      </label>
      <EmojiPicker value="🏃" onChange={noop}>
        <button
          type="button"
          className="w-14 h-14 flex items-center justify-center text-3xl bg-gray-50 border border-gray-200 rounded-xl hover:bg-gray-100 transition-colors"
        >
          🏃
        </button>
      </EmojiPicker>
    </Frame>
  );
}

export function Empty() {
  return (
    <Frame>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        アイコン
      </label>
      <EmojiPicker value="" onChange={noop}>
        <button
          type="button"
          className="w-14 h-14 flex items-center justify-center text-2xl text-gray-400 bg-gray-50 border border-dashed border-gray-300 rounded-xl hover:bg-gray-100 transition-colors"
        >
          ＋
        </button>
      </EmojiPicker>
    </Frame>
  );
}

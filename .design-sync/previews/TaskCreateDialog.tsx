import { TaskCreateDialog } from "actiko-frontend";

// タスク新規作成ダイアログ（ModalOverlay 付きモーダル）。タイトル・連携アクティビティ・
// 開始日/期限・メモの入力欄。アクティビティ選択は Dexie 由来で空のため「なし」のみだが、
// タイトル/日付/メモ欄とキャンセル/作成ボタンが描画される。
const noop = () => {};

export function Default() {
  return (
    <TaskCreateDialog
      onClose={noop}
      onSuccess={noop}
      defaultDate="2024-05-15"
    />
  );
}

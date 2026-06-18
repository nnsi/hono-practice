import { CSVExportModal } from "actiko-frontend";

// 活動ログを CSV にエクスポートするモーダル。開始日・終了日を選び、
// エクスポートボタンで期間内のログを書き出す。ModalOverlay を内部で合成し、
// 開いた状態で全体を描画する（日付未入力なのでボタンは無効状態）。
const noop = () => {};

export function Default() {
  return <CSVExportModal onClose={noop} />;
}

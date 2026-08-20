import { CSVImportModal } from "actiko-frontend";

// CSV インポートのモーダル。最初はファイル選択ステップ（ドラッグ&ドロップ風の
// アップロード領域 + テンプレートDLボタン）を表示する。ファイル選択後に
// 列マッピング → プレビューへと進む。ModalOverlay を内部で合成し開いた状態で描画。
const noop = () => {};

export function Default() {
  return <CSVImportModal onClose={noop} />;
}

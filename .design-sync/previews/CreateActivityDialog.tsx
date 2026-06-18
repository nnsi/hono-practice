import { CreateActivityDialog } from "actiko-frontend";

// アクティビティ新規作成ダイアログ（ModalOverlay 付きモーダル）。フォーム state は
// 内部フックが保持するので open フラグ無しでも props を渡せば開いた状態で描画される。
// アイコン・名前・単位・記録モード・合算統計・種類の入力欄が並ぶ。
const noop = () => {};

export function Default() {
  return <CreateActivityDialog onClose={noop} onCreated={noop} />;
}

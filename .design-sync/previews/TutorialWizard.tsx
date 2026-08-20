import { TutorialWizard } from "actiko-frontend";

// 初回起動時のチュートリアルウィザード。フルスクリーンのオーバーレイ中央に
// ステップインジケータ（ドット）・見出し・本文・戻る/次へボタンを表示する。
// 内部で useTutorial（Dexie）と i18n を読む。CreateActivityDialog はステップ操作で
// 開くため初期状態では表示されない（= 最初のステップが描画される）。
export function Default() {
  return <TutorialWizard />;
}

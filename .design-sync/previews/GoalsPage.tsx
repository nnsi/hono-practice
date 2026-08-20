import { GoalsPage } from "actiko-frontend";

// 目標一覧ページ。「進行中 / 終了」タブ + ヒートマップ + 目標カード群。
// データは Dexie の useLiveQuery 経由なので、プレビュー環境（空 IndexedDB）では
// 進行中タブ・空ヒートマップ（全セル灰色の GitHub 風グリッド）・
// 「進行中の目標はありません」空状態 +「新しい目標を追加」破線カードが描画される。
function Frame({ children }: { children: React.ReactNode }) {
  return <div style={{ width: 420 }}>{children}</div>;
}

export function Default() {
  return (
    <Frame>
      <GoalsPage />
    </Frame>
  );
}

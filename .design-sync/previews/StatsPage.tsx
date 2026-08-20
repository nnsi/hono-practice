import { StatsPage } from "actiko-frontend";

// 統計ページ。月ナビゲーションヘッダー + 月内アクティビティの統計カード群。
// データは Dexie の useLiveQuery 経由なので、プレビュー環境（空 IndexedDB）では
// 「データがありません」空状態（BarChart3 アイコン + 当月のメッセージ）が描画される。
function Frame({ children }: { children: React.ReactNode }) {
  return <div style={{ width: 420 }}>{children}</div>;
}

export function Default() {
  return (
    <Frame>
      <StatsPage />
    </Frame>
  );
}

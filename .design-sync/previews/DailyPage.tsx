import { DailyPage } from "actiko-frontend";

// 日次の記録ページ。日付ヘッダー + 「アクティビティ」「タスク」の2セクション。
// データは Dexie の useLiveQuery 経由なので、プレビュー環境（空 IndexedDB）では
// 「記録がありません」空状態 + タスク空リストの骨格が描画される。
function Frame({ children }: { children: React.ReactNode }) {
  return <div style={{ width: 420 }}>{children}</div>;
}

export function Default() {
  return (
    <Frame>
      <DailyPage />
    </Frame>
  );
}

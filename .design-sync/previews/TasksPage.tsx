import { TasksPage } from "actiko-frontend";

// タスク管理ページ。「アクティブ / アーカイブ」タブ + タスクグループ群。
// データは Dexie の useLiveQuery 経由なので、プレビュー環境（空 IndexedDB）では
// アクティブタブの空状態（「タスクがありません」+「最初のタスクを作成」ボタン）が描画される。
function Frame({ children }: { children: React.ReactNode }) {
  return <div style={{ width: 420 }}>{children}</div>;
}

export function Default() {
  return (
    <Frame>
      <TasksPage />
    </Frame>
  );
}

import { ActikoPage } from "actiko-frontend";

// アクティビティ記録のトップページ。日付ヘッダー + アクティビティグリッド。
// データは Dexie の useLiveQuery 経由なので、プレビュー環境（空 IndexedDB）では
// アクティビティ 0 件 → 「新規追加」破線カードのみの空状態の骨格が描画される。
// Router は使っていない（ヘッダーのナビは日付の前後移動のみ）ので描画可能。
function Frame({ children }: { children: React.ReactNode }) {
  return <div style={{ width: 420 }}>{children}</div>;
}

export function Default() {
  return (
    <Frame>
      <ActikoPage />
    </Frame>
  );
}

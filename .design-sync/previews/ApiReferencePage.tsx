import { ApiReferencePage } from "actiko-frontend";

// 公開 API リファレンスのページ全体。Base URL / 認証 / スコープ表 / 目次 /
// エンドポイント群 / エラーレスポンス表を縦に並べた静的ドキュメントページ。
// 「戻る」リンクで useNavigate を使うが、データはすべて generated 定数由来。
export function Default() {
  return <ApiReferencePage />;
}

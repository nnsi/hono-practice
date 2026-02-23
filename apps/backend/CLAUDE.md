# backend 開発ルール

## APIパス規約

- **末尾スラッシュなし**（Honoはトレイリングスラッシュを別ルートとして扱う）
- v2同期エンドポイントは `/users/v2/` 配下

## Honoテスト環境の注意

- `app.request()` は `executionCtx` を渡さない
- `c.executionCtx` のgetterはプロパティアクセス自体がthrowする（optional chainingが効かない）
- テストで `c.get("tracer")` は undefined → `?? noopTracer` フォールバック必須
- `waitUntil` を使うコードは `fireAndForget` ヘルパーでtry-catch包装すること

## アーキテクチャ

- route → handler → usecase → repository の層構造
- ファクトリ関数パターン: `newXXX` で依存注入
- エラーハンドリング: try-catchは使わず `throw` で例外をスロー
- レートリミッターはインフラ層（ミドルウェア）に留める。usecaseに入れない

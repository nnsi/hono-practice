# backend 開発ルール

## APIパス規約

- **末尾スラッシュなし**（Honoはトレイリングスラッシュを別ルートとして扱う）
- v2同期エンドポイントは `/users/v2/` 配下

## Honoテスト環境の注意

- `app.request()` は `executionCtx` を渡さない
- `c.executionCtx` のgetterはプロパティアクセス自体がthrowする（optional chainingが効かない）
- テストで `c.get("tracer")` は undefined → `?? noopTracer` フォールバック必須
- `waitUntil` を使うコードは `fireAndForget` ヘルパーでtry-catch包装すること
- テストファイルでは `import { describe, expect, it } from "vitest"` を明示的に書く（tsconfigにvitest globalsの型参照がないため）

## アーキテクチャ

- route → handler → usecase → repository/queryService の層構造。**handlerからrepositoryを直接呼ばない**
- ファクトリ関数パターン: `newXXX` で依存注入（`createXXX`/`getXXX` ではなく `newXXX`）
- `as` キャスト禁止（型ガード・ジェネリクス・型宣言の修正で解決する）
- 型定義は `type` を使う（`interface` ではない）
- エラーハンドリング: try-catchは使わず `throw` で例外をスロー
- レートリミッターはインフラ層（ミドルウェア）に留める。usecaseに入れない
- 新規にエンドポイントを生やす際には、`/scripts/generate-feature.js` を利用すること

- 外部API呼び出しはエラー時にフォールバックがあるか（Promise.allで巻き込み500にしない）
- ユーザー入力（query params等）にバリデーションがあるか

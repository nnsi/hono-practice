# Backend

- API path は末尾スラッシュなし。v2 同期は `/users/v2/` 配下。
- `route → handler → usecase → repository/queryService`。handler から repository を直接呼ばない。Repository メソッド名にはドメイン名を含める。
- DI factory は `newXxx`。Route は既存の `createXxxRoute` も使える。型定義は `type`。
- 入力は Zod で検証する。キャストや `c.req.json<T>()` で検証を代用しない。
- 通常のエラーは throw して共通エラーハンドラーへ渡す。外部 API のフォールバックなど、回復する処理では catch を使う。rate limit は middleware に置く。
- 新規 feature は `.agents/skills/scaffold/SKILL.md` のジェネレーターを使う。

## テスト

- 新規 endpoint は Hono + PGlite の統合テストで正常・認可・失敗系を確認する。参照: `apps/backend/feature/activity/test/activityRoute.test.ts`、`apps/backend/test.setup.ts`。
- DELETE は FK 参照データを含める。AppError の status 確認には `newHonoWithErrorHandling()` を使う。
- `app.request()` に executionCtx はない。`c.executionCtx` の getter 自体が throw するため optional chaining で回避できない。`waitUntil` は既存の `fireAndForget` を使う。
- テストで tracer 未設定なら `noopTracer` へフォールバックする。Vitest の `describe` / `expect` / `it` は明示 import。

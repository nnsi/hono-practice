# 統合テスト必須ルール

## 新規 route エンドポイントには必ず Hono 統合テストを書く

- PGlite ベースのテスト環境が既に整備されている（`apps/backend/test.setup.ts`）
- `testDB` を使えば実 FK 制約含めて検証可能
- モックテストだけでは削除順序、JOIN 整合性、FK違反等の実DBバグを検出できない

## 書き方は既存パターンを踏襲

- 参照: `apps/backend/feature/activity/test/activityRoute.test.ts`
- `testClient(app, { DB: testDB, ... })` で呼び出し
- エラー系を検証するときは `newHonoWithErrorHandling().route("/", xxxRoute)` でラップすること（AppError → 適切な status code にマップされる）
- 破壊的操作（DELETE）は特に **FK 参照データを含めたシナリオ**を用意する

## 「既存featureにテスト無し」は免罪符にならない

- 過去の抜けを正す責任は新規PRにある
- 特に破壊的操作や admin 配下は failure cost が高いので、統合テストを優先的に入れる
- 新規エンドポイントを追加する PR で、その featureディレクトリに route.test.ts が無ければ新設する

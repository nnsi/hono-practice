# API Key 機能コードレビュー

## 1. アーキテクチャ／一貫性

- Repository → Usecase → Handler → Route のレイヤード構成は既存コードと整合している。
- `apiKeyHandler.ts` 内で `maskApiKey` を import しているが未使用。未使用 import を削除し、CI で検知できる体制を推奨。
- `createApiKeyRoute` が毎リクエスト毎に Repository / Usecase / Handler を生成している。コストは小さいが、DI コンテナなどを用いて共有インスタンス化する方針があるなら統一したい。
- 一部テストでは `newHonoWithErrorHandling()` を、他では素の `Hono()` を使用している。実運用時にエラーハンドラを必ず通す設計ならテストも統一する。

## 2. API キーのセキュリティ

| 問題点 | 推奨対応 |
| --- | --- |
| DB に平文で API キーを保存 | 1) 保存時に `sha256(key)` などでハッシュ化<br>2) 検証時に同じハッシュを比較<br>3) 発行時のみプレーン値を返す（現状維持） |
| キー生成ロジックが不明 | `crypto.randomBytes` など CSPRNG を使用して十分な長さのキーを生成するか確認 |
| キー列マスキング形式 | 先頭／末尾のみ数文字を表示し、長さを固定すると推測をさらに困難にできる |
| `key` カラムの一意制約 | DB スキーマで UNIQUE 制約を追加 |
| Rate-limit & 乱用検知 | 別レイヤでの実装を検討 (例: API Gateway, WAF) |

## 3. ビジネスロジック

- `revokeApiKey` / `deleteApiKey` が対象キーを取得するために `findByUserId` で全件取得後、メモリ検索している。`repo.findById(id, userId)` のように SQL で `AND userId = ?` を行うと効率的。
- `deleteApiKey` (論理削除) と `revokeApiKey` (無効化) の役割を README/コメントで明確化し、`delete` 時にも `isActive=false` にするかを検討。
- `validateApiKey` の `repo.update(...).catch(console.error)` は失敗時にサイレント。監視ツールへの通知などを行う。
- TODO にある KV キャッシュ削除／保存を実装しないとキー失効後も認証が通るリスクがある。

## 4. 型・エラーハンドリング

- Usecase 型で `| SqlExecutionError` を返すが、現状 Repo から該当エラーを受け取る経路がない。throw 型か戻り値型か方針を統一。
- `ResourceNotFoundError` を Usecase が throw し、Handler/Route で `AppError` を生成するパスと処理委譲の責務を整理。
- `newHonoWithErrorHandling` を必ず Route 作成時に挟む設計に統一すると読みやすい。

## 5. テスト

- 正常系／異常系が網羅的で可読性も高い。
- エラーハンドラの統一後、テストの app 作成も一本化すると良い。
- 追加案: ①削除済みキーで `validateApiKey` が失敗するテスト ②重複キー発行不可テスト ③ハッシュ比較テスト等。

## 6. その他改善アイディア

1. ユーザー当たりの API キー数上限を設定し、作成時に検証。
2. キー名の重複チェック (同一ユーザー内で同名禁止／上書き) を要件に合わせて実装。
3. 監査ログ (作成／失効／削除／利用) を別テーブルまたはロギングで保存。
4. OpenAPI 生成やドキュメント自動公開を行い、フロントエンドや外部利用者に仕様を共有。

## まとめ

レイヤード構成・バリデーション・テストは良好で、基本的な CRUD 機能は満たしている。ただし以下の点を優先的に対応することで、より安全で保守しやすい実装になる。

- **平文保存 → ハッシュ保存** への切り替え
- **SQL 効率化** (ID + userId クエリ)
- **Error ハンドリング統一** と **未使用コード削除**
- **キャッシュ連携 (KV)** の TODO 消化

以上を反映すれば、セキュリティとパフォーマンスの両面で堅牢な API Key 管理機能となります。 
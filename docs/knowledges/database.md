# データベースの管理について

## 概要

本アプリケーションでは、PostgreSQLをデータベースとして使用し、Drizzle ORMでスキーマ管理とクエリ実行を行っています。
データベースはNeon PostgreSQLでホスティングされており、Cloudflare Workersから接続しています。

## ORM: Drizzle

- **特徴**: TypeScript完全対応、型安全なクエリビルダー
- **スキーマ定義**: `infra/drizzle/schema.ts`
- **マイグレーション**: `infra/drizzle`ディレクトリで管理
- **接続設定**: 環境変数`DATABASE_URL`を使用

## テーブル構造

### 1. user（ユーザー）
ユーザーの基本情報を管理するテーブル。

| カラム名 | 型 | 制約 | 説明 |
|---------|-----|-----|------|
| id | UUID | PK | ユーザーID |
| login_id | TEXT | UNIQUE, NOT NULL | ログインID |
| name | TEXT | | ユーザー名 |
| password | TEXT | | ハッシュ化されたパスワード |
| created_at | TIMESTAMP | NOT NULL | 作成日時 |
| updated_at | TIMESTAMP | NOT NULL | 更新日時 |
| deleted_at | TIMESTAMP | | 削除日時（論理削除） |

インデックス: login_id

### 2. user_provider（プロバイダー連携）
外部認証プロバイダー（Google等）との連携情報を管理。

| カラム名 | 型 | 制約 | 説明 |
|---------|-----|-----|------|
| id | UUID | PK | プロバイダー連携ID |
| user_id | UUID | FK(users), NOT NULL | ユーザーID |
| provider | TEXT | NOT NULL | プロバイダー名（例: google） |
| provider_account_id | TEXT | NOT NULL | プロバイダー側のアカウントID |
| provider_refresh_token | TEXT | | プロバイダーのリフレッシュトークン |
| created_at | TIMESTAMP | NOT NULL | 作成日時 |
| updated_at | TIMESTAMP | NOT NULL | 更新日時 |
| deleted_at | TIMESTAMP | | 削除日時 |

### 3. refresh_token（リフレッシュトークン）
認証用のリフレッシュトークンを管理。

| カラム名 | 型 | 制約 | 説明 |
|---------|-----|-----|------|
| id | UUID | PK | トークンID |
| user_id | UUID | FK(users), NOT NULL | ユーザーID |
| selector | TEXT | UNIQUE, NOT NULL | トークンセレクター |
| token | TEXT | NOT NULL | ハッシュ化されたトークン |
| expires_at | TIMESTAMP | NOT NULL | 有効期限 |
| revoked_at | TIMESTAMP | | 無効化日時 |
| created_at | TIMESTAMP | NOT NULL | 作成日時 |
| updated_at | TIMESTAMP | NOT NULL | 更新日時 |
| deleted_at | TIMESTAMP | | 削除日時 |

インデックス: user_id, selector

### 4. task（タスク）
タスク管理機能のデータを格納。

| カラム名 | 型 | 制約 | 説明 |
|---------|-----|-----|------|
| id | UUID | PK | タスクID |
| user_id | UUID | FK(users), NOT NULL | ユーザーID |
| title | TEXT | NOT NULL | タスクタイトル |
| done_date | DATE | | 完了日 |
| memo | TEXT | DEFAULT '' | メモ |
| start_date | DATE | | 開始日 |
| due_date | DATE | | 期限日 |
| created_at | TIMESTAMP | NOT NULL | 作成日時 |
| updated_at | TIMESTAMP | NOT NULL | 更新日時 |
| deleted_at | TIMESTAMP | | 削除日時 |

インデックス: user_id, created_at

### 5. activity（活動）
ユーザーが記録する活動の種類を定義。

| カラム名 | 型 | 制約 | 説明 |
|---------|-----|-----|------|
| id | UUID | PK | 活動ID |
| user_id | UUID | FK(users), NOT NULL | ユーザーID |
| name | TEXT | NOT NULL | 活動名 |
| label | TEXT | DEFAULT '' | ラベル |
| emoji | TEXT | DEFAULT '' | 絵文字 |
| description | TEXT | DEFAULT '' | 説明 |
| quantity_unit | TEXT | DEFAULT '' | 単位（回、分、時間など） |
| order_index | TEXT | DEFAULT '' | 表示順序 |
| show_combined_stats | BOOLEAN | NOT NULL, DEFAULT true | 統合統計の表示フラグ |
| created_at | TIMESTAMP | NOT NULL | 作成日時 |
| updated_at | TIMESTAMP | NOT NULL | 更新日時 |
| deleted_at | TIMESTAMP | | 削除日時 |

インデックス: user_id, created_at

### 6. activity_kind（活動の種類）
活動のサブカテゴリーを管理（例：読書→技術書、小説など）。

| カラム名 | 型 | 制約 | 説明 |
|---------|-----|-----|------|
| id | UUID | PK | 種類ID |
| activity_id | UUID | FK(activities), NOT NULL | 活動ID |
| name | TEXT | NOT NULL | 種類名 |
| order_index | TEXT | DEFAULT '' | 表示順序 |
| created_at | TIMESTAMP | NOT NULL | 作成日時 |
| updated_at | TIMESTAMP | NOT NULL | 更新日時 |
| deleted_at | TIMESTAMP | | 削除日時 |

インデックス: activity_id

### 7. activity_log（活動記録）
実際の活動記録データ。

| カラム名 | 型 | 制約 | 説明 |
|---------|-----|-----|------|
| id | UUID | PK | 記録ID |
| user_id | UUID | FK(users), NOT NULL | ユーザーID |
| activity_id | UUID | FK(activities), NOT NULL | 活動ID |
| activity_kind_id | UUID | FK(activity_kinds) | 活動種類ID |
| quantity | NUMERIC | | 数量 |
| memo | TEXT | DEFAULT '' | メモ |
| date | DATE | NOT NULL | 記録日 |
| done_hour | TIME | | 実施時刻 |
| created_at | TIMESTAMP | NOT NULL | 作成日時 |
| updated_at | TIMESTAMP | NOT NULL | 更新日時 |
| deleted_at | TIMESTAMP | | 削除日時 |

インデックス: activity_id, activity_kind_id, date

### 8. activity_goal（活動目標）
活動ごとの目標設定を管理。

| カラム名 | 型 | 制約 | 説明 |
|---------|-----|-----|------|
| id | UUID | PK | 目標ID |
| user_id | UUID | FK(users), NOT NULL | ユーザーID |
| activity_id | UUID | FK(activities), NOT NULL | 活動ID |
| daily_target_quantity | NUMERIC | NOT NULL | 日次目標数量 |
| start_date | DATE | NOT NULL | 開始日 |
| end_date | DATE | | 終了日 |
| is_active | BOOLEAN | NOT NULL, DEFAULT true | 有効フラグ |
| description | TEXT | | 説明 |
| created_at | TIMESTAMP | NOT NULL | 作成日時 |
| updated_at | TIMESTAMP | NOT NULL | 更新日時 |
| deleted_at | TIMESTAMP | | 削除日時 |

インデックス: user_id, activity_id

### 9. sync_metadata（同期メタデータ）
オフライン同期用のメタデータを管理。

| カラム名 | 型 | 制約 | 説明 |
|---------|-----|-----|------|
| id | TEXT | PK | メタデータID |
| user_id | TEXT | NOT NULL | ユーザーID |
| entity_type | TEXT | NOT NULL | エンティティタイプ |
| entity_id | TEXT | NOT NULL | エンティティID |
| last_synced_at | TIMESTAMP | | 最終同期日時 |
| status | TEXT | NOT NULL, DEFAULT 'pending' | 同期ステータス |
| error_message | TEXT | | エラーメッセージ |
| retry_count | NUMERIC | NOT NULL, DEFAULT 0 | リトライ回数 |
| created_at | TIMESTAMP | NOT NULL | 作成日時 |
| updated_at | TIMESTAMP | NOT NULL | 更新日時 |

インデックス: user_id, entity_type/entity_id, status

### 10. sync_queue（同期キュー）
オフライン時の操作を保存する同期キュー。

| カラム名 | 型 | 制約 | 説明 |
|---------|-----|-----|------|
| id | TEXT | PK | キューID |
| user_id | TEXT | NOT NULL | ユーザーID |
| entity_type | TEXT | NOT NULL | エンティティタイプ |
| entity_id | TEXT | NOT NULL | エンティティID |
| operation | TEXT | NOT NULL | 操作種別（create/update/delete） |
| payload | TEXT | NOT NULL | ペイロード（JSON） |
| timestamp | TIMESTAMP | NOT NULL | タイムスタンプ |
| sequence_number | NUMERIC | NOT NULL | シーケンス番号 |
| created_at | TIMESTAMP | NOT NULL | 作成日時 |

インデックス: user_id, user_id/sequence_number, timestamp, entity_type/entity_id

## リレーション

1. **user → activity**: 1対多
2. **activity → activity_kind**: 1対多
3. **activity → activity_log**: 1対多
4. **activity_kind → activity_log**: 1対多（optional）
5. **user → task**: 1対多
6. **user → refresh_token**: 1対多
7. **user → user_provider**: 1対多
8. **user → activity_goal**: 1対多
9. **activity → activity_goal**: 1対多

## マイグレーション

### 実行コマンド
```bash
# マイグレーションファイル生成
npm run db-generate

# マイグレーション適用
npm run db-migrate
```

### マイグレーションファイル
- 場所: `infra/drizzle/`
- 命名規則: `0000_xxxx_xxxx.sql`（自動生成）

## 論理削除

すべてのテーブルに`deleted_at`カラムがあり、物理削除ではなく論理削除を行います。
- NULL: 有効なレコード
- タイムスタンプ: 削除されたレコード（削除日時）

## インデックス戦略

1. **主キー**: すべてUUID v4を使用
2. **外部キー**: 参照整合性を保証
3. **検索用インデックス**: 
   - ユーザーIDでのフィルタリング
   - 日付でのソート・フィルタリング
   - ステータスでのフィルタリング

## セキュリティ考慮事項

1. **パスワード**: bcryptでハッシュ化
2. **トークン**: ランダム文字列をハッシュ化して保存
3. **接続**: SSL/TLS暗号化必須
4. **アクセス制御**: Row Level Security（RLS）を検討中

## パフォーマンス最適化

1. **適切なインデックス**: 頻繁に検索されるカラムにインデックス
2. **N+1問題の回避**: Drizzleのリレーション機能を活用
3. **バッチ処理**: 同期機能では複数レコードをまとめて処理
4. **接続プール**: Cloudflare Workersの制約内で最適化
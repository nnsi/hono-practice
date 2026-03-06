# データベースの管理について

## 概要

PostgreSQLをデータベースとして使用し、Drizzle ORMでスキーマ管理とクエリ実行を行っている。
データベースはNeon PostgreSQLでホスティングされ、Cloudflare Workersから接続。
ローカル開発はdocker composeのPostgresコンテナ（DB名: `db`）。

## ORM: Drizzle

- **特徴**: TypeScript完全対応、型安全なクエリビルダー
- **スキーマ定義**: `infra/drizzle/schema.ts`
- **マイグレーション**: `infra/drizzle/`ディレクトリで管理
- **接続設定**: 環境変数`DATABASE_URL`を使用

## テーブル構造

### 1. user（ユーザー）

| カラム名 | 型 | 制約 | 説明 |
|---------|-----|-----|------|
| id | UUID | PK, defaultRandom | ユーザーID |
| login_id | TEXT | UNIQUE, NOT NULL | ログインID |
| name | TEXT | | ユーザー名 |
| password | TEXT | | ハッシュ化されたパスワード |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT now | 作成日時 |
| updated_at | TIMESTAMPTZ | NOT NULL, DEFAULT now | 更新日時 |
| deleted_at | TIMESTAMPTZ | | 削除日時（論理削除） |

インデックス: login_id

### 2. user_provider（プロバイダー連携）

| カラム名 | 型 | 制約 | 説明 |
|---------|-----|-----|------|
| id | UUID | PK | プロバイダー連携ID |
| user_id | UUID | FK(user), NOT NULL | ユーザーID |
| provider | TEXT | NOT NULL | プロバイダー名（例: google） |
| provider_account_id | TEXT | NOT NULL | プロバイダー側のアカウントID |
| email | TEXT | | プロバイダーのメールアドレス |
| provider_refresh_token | TEXT | | プロバイダーのリフレッシュトークン |
| created_at | TIMESTAMPTZ | NOT NULL | 作成日時 |
| updated_at | TIMESTAMPTZ | NOT NULL | 更新日時 |
| deleted_at | TIMESTAMPTZ | | 削除日時 |

### 3. refresh_token（リフレッシュトークン）

| カラム名 | 型 | 制約 | 説明 |
|---------|-----|-----|------|
| id | UUID | PK | トークンID |
| user_id | UUID | FK(user), NOT NULL | ユーザーID |
| selector | TEXT | UNIQUE, NOT NULL | トークンセレクター |
| token | TEXT | NOT NULL | ハッシュ化されたトークン |
| expires_at | TIMESTAMPTZ | NOT NULL | 有効期限 |
| revoked_at | TIMESTAMPTZ | | 無効化日時 |
| created_at | TIMESTAMPTZ | NOT NULL | 作成日時 |
| updated_at | TIMESTAMPTZ | NOT NULL | 更新日時 |
| deleted_at | TIMESTAMPTZ | | 削除日時 |

インデックス: user_id, selector

### 4. activity（活動）

ユーザーが記録する活動の種類を定義。

| カラム名 | 型 | 制約 | 説明 |
|---------|-----|-----|------|
| id | UUID | PK | 活動ID |
| user_id | UUID | FK(user), NOT NULL | ユーザーID |
| name | TEXT | NOT NULL | 活動名 |
| label | TEXT | DEFAULT '' | ラベル |
| emoji | TEXT | DEFAULT '' | 絵文字 |
| icon_type | ENUM | NOT NULL, DEFAULT 'emoji' | アイコン種別（emoji/upload/generate） |
| icon_url | TEXT | | アップロード/生成アイコンのURL |
| icon_thumbnail_url | TEXT | | サムネイルURL |
| description | TEXT | DEFAULT '' | 説明 |
| quantity_unit | TEXT | DEFAULT '' | 単位（回、分、時間など） |
| order_index | TEXT | DEFAULT '' | 表示順序 |
| show_combined_stats | BOOLEAN | NOT NULL, DEFAULT true | 統合統計の表示フラグ |
| created_at | TIMESTAMPTZ | NOT NULL | 作成日時 |
| updated_at | TIMESTAMPTZ | NOT NULL | 更新日時 |
| deleted_at | TIMESTAMPTZ | | 削除日時 |

インデックス: user_id, created_at

### 5. activity_kind（活動の種類）

活動のサブカテゴリーを管理（例：読書→技術書、小説など）。

| カラム名 | 型 | 制約 | 説明 |
|---------|-----|-----|------|
| id | UUID | PK | 種類ID |
| activity_id | UUID | FK(activity), NOT NULL | 活動ID |
| name | TEXT | NOT NULL | 種類名 |
| color | TEXT | | 色設定（hex形式: #RRGGBB） |
| order_index | TEXT | DEFAULT '' | 表示順序 |
| created_at | TIMESTAMPTZ | NOT NULL | 作成日時 |
| updated_at | TIMESTAMPTZ | NOT NULL | 更新日時 |
| deleted_at | TIMESTAMPTZ | | 削除日時 |

インデックス: activity_id

### 6. activity_log（活動記録）

実際の活動記録データ。

| カラム名 | 型 | 制約 | 説明 |
|---------|-----|-----|------|
| id | UUID | PK | 記録ID |
| user_id | UUID | FK(user), NOT NULL | ユーザーID |
| activity_id | UUID | FK(activity), NOT NULL | 活動ID |
| activity_kind_id | UUID | FK(activity_kind) | 活動種類ID（任意） |
| quantity | NUMERIC | | 数量 |
| memo | TEXT | DEFAULT '' | メモ |
| date | DATE | NOT NULL | 記録日 |
| done_hour | TIME | | 実施時刻 |
| created_at | TIMESTAMPTZ | NOT NULL | 作成日時 |
| updated_at | TIMESTAMPTZ | NOT NULL | 更新日時 |
| deleted_at | TIMESTAMPTZ | | 削除日時 |

インデックス: activity_id, activity_kind_id, date, (user_id + date)複合

### 7. activity_goal（活動目標）

活動ごとの目標設定を管理。

| カラム名 | 型 | 制約 | 説明 |
|---------|-----|-----|------|
| id | UUID | PK | 目標ID |
| user_id | UUID | FK(user), NOT NULL | ユーザーID |
| activity_id | UUID | FK(activity), NOT NULL | 活動ID |
| daily_target_quantity | NUMERIC | NOT NULL | 日次目標数量 |
| start_date | DATE | NOT NULL | 開始日 |
| end_date | DATE | | 終了日 |
| is_active | BOOLEAN | NOT NULL, DEFAULT true | 有効フラグ |
| description | TEXT | | 説明 |
| created_at | TIMESTAMPTZ | NOT NULL | 作成日時 |
| updated_at | TIMESTAMPTZ | NOT NULL | 更新日時 |
| deleted_at | TIMESTAMPTZ | | 削除日時 |

インデックス: user_id, activity_id

### 8. task（タスク）

タスク管理機能のデータ。

| カラム名 | 型 | 制約 | 説明 |
|---------|-----|-----|------|
| id | UUID | PK | タスクID |
| user_id | UUID | FK(user), NOT NULL | ユーザーID |
| title | TEXT | NOT NULL | タスクタイトル |
| done_date | DATE | | 完了日 |
| memo | TEXT | DEFAULT '' | メモ |
| start_date | DATE | | 開始日 |
| due_date | DATE | | 期限日 |
| archived_at | TIMESTAMPTZ | | アーカイブ日時 |
| created_at | TIMESTAMPTZ | NOT NULL | 作成日時 |
| updated_at | TIMESTAMPTZ | NOT NULL | 更新日時 |
| deleted_at | TIMESTAMPTZ | | 削除日時 |

インデックス: user_id, created_at

### 9. api_key（APIキー）

| カラム名 | 型 | 制約 | 説明 |
|---------|-----|-----|------|
| id | UUID | PK | APIキーID |
| user_id | UUID | FK(user), NOT NULL | ユーザーID |
| key | TEXT | UNIQUE, NOT NULL | APIキー（ハッシュ化） |
| name | TEXT | NOT NULL | APIキー名 |
| last_used_at | TIMESTAMPTZ | | 最終使用日時 |
| is_active | BOOLEAN | NOT NULL, DEFAULT true | 有効フラグ |
| created_at | TIMESTAMPTZ | NOT NULL | 作成日時 |
| updated_at | TIMESTAMPTZ | NOT NULL | 更新日時 |
| deleted_at | TIMESTAMPTZ | | 削除日時 |

インデックス: user_id, key

### 10. user_subscription（ユーザーサブスクリプション）

| カラム名 | 型 | 制約 | 説明 |
|---------|-----|-----|------|
| id | UUID | PK | サブスクリプションID |
| user_id | UUID | FK(user), UNIQUE, NOT NULL | ユーザーID |
| plan | TEXT | NOT NULL, DEFAULT 'free' | プラン（free/premium/enterprise） |
| status | TEXT | NOT NULL, DEFAULT 'trial' | ステータス（trial/active/paused/cancelled/expired） |
| payment_provider | TEXT | | 決済プロバイダー（stripe等） |
| payment_provider_id | TEXT | | プロバイダー側のID |
| current_period_start | TIMESTAMPTZ | | 現在の期間開始日 |
| current_period_end | TIMESTAMPTZ | | 現在の期間終了日 |
| cancel_at_period_end | BOOLEAN | NOT NULL, DEFAULT false | 期間終了時キャンセルフラグ |
| cancelled_at | TIMESTAMPTZ | | キャンセル日時 |
| trial_start | TIMESTAMPTZ | | トライアル開始日 |
| trial_end | TIMESTAMPTZ | | トライアル終了日 |
| price_amount | NUMERIC | | 価格 |
| price_currency | TEXT | DEFAULT 'JPY' | 通貨 |
| metadata | TEXT | | 追加情報（JSON） |
| created_at | TIMESTAMPTZ | NOT NULL | 作成日時 |
| updated_at | TIMESTAMPTZ | NOT NULL | 更新日時 |

インデックス: user_id, status, plan

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
10. **user → api_key**: 1対多
11. **user → user_subscription**: 1対1

## マイグレーション

### 実行コマンド
```bash
# マイグレーションファイル生成
pnpm run db-generate

# マイグレーション適用
pnpm run db-migrate
```

### マイグレーションファイル
- 場所: `infra/drizzle/`
- 命名規則: `0000_xxxx_xxxx.sql`（自動生成）

## 論理削除

ほぼすべてのテーブルに`deleted_at`カラムがあり、物理削除ではなく論理削除を行う。
- NULL: 有効なレコード
- タイムスタンプ: 削除されたレコード

※ `user_subscription`テーブルのみ`deleted_at`を持たない。

## インデックス戦略

1. **主キー**: すべてUUID v4を使用（`defaultRandom()`）
2. **外部キー**: 参照整合性を保証
3. **検索用インデックス**:
   - ユーザーIDでのフィルタリング
   - 日付でのソート・フィルタリング
   - ステータスでのフィルタリング
   - 複合インデックス: activity_log の (user_id, date)

## セキュリティ考慮事項

1. **パスワード**: bcryptでハッシュ化
2. **トークン**: ランダム文字列をハッシュ化して保存
3. **接続**: SSL/TLS暗号化必須

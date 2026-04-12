# APIキー機能実装タスクリスト

## 概要
ユーザーがAPIキーを発行し、APIキーを使用してActivityLogとTaskのCRUD操作を行える機能を実装する。

## タスクリスト

### 1. データベース設計・実装
- [x] api_keysテーブルのスキーマ定義
  - [x] id (UUID)
  - [x] user_id (UUID, FK to users)
  - [x] key (string, unique, indexed)
  - [x] name (string) - APIキーの識別名
  - [x] created_at (timestamp)
  - [x] last_used_at (timestamp, nullable)
  - [x] is_active (boolean, default: true)
- [x] マイグレーションファイルの作成
- [x] マイグレーションの実行

### 2. バックエンド - APIキー管理機能
- [x] APIキードメインモデルの作成 (`apps/backend/domain/apiKey.ts`)
- [x] APIキーリポジトリの実装 (`apps/backend/feature/apiKey/repository.ts`)
  - [x] create - APIキー作成
  - [x] findByUserId - ユーザーのAPIキー一覧取得
  - [x] findByKey - APIキーで検索
  - [x] update - APIキー更新（last_used_at等）
  - [x] delete - APIキー削除
- [x] APIキーユースケースの実装 (`apps/backend/feature/apiKey/usecase.ts`)
  - [x] generateApiKey - APIキー生成ロジック
  - [x] createApiKey - APIキー作成
  - [x] listApiKeys - APIキー一覧取得
  - [x] revokeApiKey - APIキー無効化
  - [x] deleteApiKey - APIキー削除
- [x] APIキーハンドラーの実装 (`apps/backend/feature/apiKey/handler.ts`)
  - [x] POST /users/api-keys - APIキー作成
  - [x] GET /users/api-keys - APIキー一覧取得
  - [x] PUT /users/api-keys/:id - APIキー無効化
  - [x] DELETE /users/api-keys/:id - APIキー削除

### 3. 認証ミドルウェアの拡張
- [x] APIキー認証ミドルウェアの作成 (`apps/backend/middleware/apiKeyAuth.ts`)
  - [x] Authorization: Bearer {api_key} 形式のサポート
  - [x] APIキーの検証
  - [x] last_used_atの更新
- [x] 既存の認証ミドルウェアとの統合
  - [x] JWT認証とAPIキー認証の両方をサポート

### 4. API v1エンドポイントの実装
- [x] ActivityLog API (`/api/v1/activity-logs`)
  - [x] GET /api/v1/activity-logs - 一覧取得
  - [x] GET /api/v1/activity-logs/:id - 詳細取得
  - [x] POST /api/v1/activity-logs - 作成
  - [x] PUT /api/v1/activity-logs/:id - 更新
  - [x] DELETE /api/v1/activity-logs/:id - 削除
- [x] Task API (`/api/v1/tasks`)
  - [x] GET /api/v1/tasks - 一覧取得
  - [x] GET /api/v1/tasks/:id - 詳細取得
  - [x] POST /api/v1/tasks - 作成
  - [x] PUT /api/v1/tasks/:id - 更新
  - [x] DELETE /api/v1/tasks/:id - 削除

### 5. フロントエンド - APIキー管理画面
- [x] APIキー管理コンポーネントの作成 (`apps/frontend/src/components/apiKey/`)
  - [x] APIKeyList - APIキー一覧表示
  - [x] CreateApiKeyDialog - APIキー作成ダイアログ
  - [x] ApiKeyManager - APIキー管理メインコンポーネント
- [x] 設定画面へのAPIキー管理セクション追加
- [x] APIキー関連のhooks作成
  - [x] useApiKeys - APIキー一覧取得
  - [x] useCreateApiKey - APIキー作成
  - [x] useRevokeApiKey - APIキー無効化
  - [x] useDeleteApiKey - APIキー削除
- [x] APIキーのコピー機能実装

### 6. テスト
- [スキップ] APIキー機能のユニットテスト
  - [スキップ] リポジトリテスト
  - [スキップ] ユースケーステスト
  - [スキップ] ハンドラーテスト
- [スキップ] APIキー認証ミドルウェアのテスト
- [スキップ] API v1エンドポイントのテスト
  - [スキップ] ActivityLog APIテスト
  - [スキップ] Task APIテスト
- [スキップ] フロントエンドコンポーネントのテスト

### 7. ドキュメント
- [x] API仕様書の作成（以下に記載）
- [x] 使用方法のドキュメント作成（以下に記載）

## API仕様

### APIキーの管理

#### APIキー一覧取得
```
GET /users/api-keys
Authorization: Bearer {jwt_token}
```

#### APIキー作成
```
POST /users/api-keys
Authorization: Bearer {jwt_token}
Content-Type: application/json

{
  "name": "APIキーの名前"
}
```

#### APIキー無効化
```
PUT /users/api-keys/{id}
Authorization: Bearer {jwt_token}
```

#### APIキー削除
```
DELETE /users/api-keys/{id}
Authorization: Bearer {jwt_token}
```

### API v1エンドポイント

#### ActivityLog API
```
# 一覧取得
GET /api/v1/activity-logs?date=2024-01-01
Authorization: Bearer {api_key}

# 詳細取得
GET /api/v1/activity-logs/{id}
Authorization: Bearer {api_key}

# 作成
POST /api/v1/activity-logs
Authorization: Bearer {api_key}
Content-Type: application/json

# 更新
PUT /api/v1/activity-logs/{id}
Authorization: Bearer {api_key}
Content-Type: application/json

# 削除
DELETE /api/v1/activity-logs/{id}
Authorization: Bearer {api_key}
```

#### Task API
```
# 一覧取得
GET /api/v1/tasks?date=2024-01-01
Authorization: Bearer {api_key}

# 詳細取得
GET /api/v1/tasks/{id}
Authorization: Bearer {api_key}

# 作成
POST /api/v1/tasks
Authorization: Bearer {api_key}
Content-Type: application/json

# 更新
PUT /api/v1/tasks/{id}
Authorization: Bearer {api_key}
Content-Type: application/json

# 削除
DELETE /api/v1/tasks/{id}
Authorization: Bearer {api_key}
```

## 使用方法

1. 設定画面からAPIキー管理セクションにアクセス
2. 「新しいAPIキーを作成」ボタンをクリック
3. APIキーに識別しやすい名前を付けて作成
4. 表示されたAPIキーをコピーして安全に保管（一度しか表示されません）
5. 外部アプリケーションからのリクエストにAPIキーを使用

```javascript
// 使用例
const response = await fetch('https://api.example.com/api/v1/activity-logs', {
  headers: {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json'
  }
});
```

## 実装順序
1. データベース設計・実装
2. バックエンドのAPIキー管理機能
3. 認証ミドルウェアの拡張
4. API v1エンドポイントの実装
5. フロントエンドのAPIキー管理画面
6. テストの実装
7. ドキュメント作成
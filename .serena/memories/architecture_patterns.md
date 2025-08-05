# アーキテクチャパターン

## バックエンドアーキテクチャ

### レイヤー構造
```
Route (DI, Validation) 
  → Handler (Transform, Validation) 
  → Usecase (Business Logic) 
  → Repository (Mapping, DB Query) 
  → Database
```

### 各レイヤーの責務

#### Route層
- HTTPリクエストの受付とルーティング（Hono）
- バリデーション（@hono/zod-validator + @dtos/request）
- 依存関係の注入（c.set('key', instance)）

#### Handler層
- Routeからコンテキスト経由で依存関係を受け取る（c.var.uc）
- リクエスト/レスポンスの変換
- エラーハンドリング
- レスポンスのバリデーション（@dtos/response）

#### Usecase層
- ファクトリ関数（newXXXUsecase）で依存関係を受け取る
- ビジネスロジックの実装
- ドメインエンティティの操作
- トランザクション管理

#### Repository層
- ファクトリ関数（newXXXRepository）でDB接続を受け取る
- データの永続化と取得
- ドメインモデルとDBスキーマのマッピング
- Drizzle ORMを使用したクエリ実行

### カスタムエラークラス
- `AppError` - 基底エラークラス（HTTPステータスコード付き）
- `UnauthorizedError` - 認証エラー（401）
- `ResourceNotFoundError` - リソース不在（404）
- `DomainValidateError` - ドメイン検証エラー
- `SqlExecutionError` - DB実行エラー

## フロントエンドアーキテクチャ

### コンポーネントとフックの責務分離

#### コンポーネント
- UIの表示のみを担当
- フックから受け取ったデータとハンドラーを使用
- ビジネスロジック、状態管理、API通信は行わない

#### カスタムフック
- すべての状態管理
- API通信とデータフェッチ
- ビジネスロジックの実装
- イベントハンドラーの実装
- フォーム管理とバリデーション

### 状態管理
- **サーバー状態**: Tanstack Query
- **ローカル状態**: React Context（認証、グローバル日付など）
- **フォーム状態**: React Hook Form + Zod

## 共通パターン

### 依存注入
- ファクトリ関数パターン（newXXX）
- 必要な依存関係を引数で受け取る
- オブジェクトを返す

### 型安全性
- すべてtype定義（interfaceは使用しない）
- Zodスキーマによる実行時検証
- 共有型定義は packages/types に集約
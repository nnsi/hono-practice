# バックエンドの構造について

## アーキテクチャ概要

本プロジェクトのバックエンドは、クリーンアーキテクチャの原則に基づいて設計されています。主に以下の4つのレイヤーで構成されています：

1. **プレゼンテーション層（Route）**
   - HTTPリクエストの受付とルーティング (Hono)
   - リクエストのバリデーション (`@hono/zod-validator` と `@dtos/request` スキーマを使用)
   - **依存関係の注入**: アプリケーション起動時またはリクエスト毎のミドルウェア内で、UsecaseやRepositoryなどの依存関係をインスタンス化し、Honoのコンテキスト (`c.set('key', instance)`) に設定します。
   - レスポンスの返却 (Handlerから受け取ったレスポンスオブジェクト)

2. **アプリケーション層（Handler）**
   - Routeからコンテキスト経由で依存関係 (Usecaseインスタンス) を受け取ります (`c.var.uc` など)。
   - リクエスト/レスポンスの変換 (Routeからのバリデーション済みデータ -> Usecase Input型、Usecase Output -> レスポンススキーマ)
   - エラーハンドリング (Usecaseからスローされたエラーのハンドリング)
   - レスポンスのバリデーション (`@dtos/response` スキーマを使用)

3. **ユースケース層（Usecase）**
   - **依存関係の受け取り**: ファクトリ関数 (`newXXXUsecase`) の引数として、必要なRepositoryや外部サービスクライアントのインスタンス、設定値（APIキーなど）を受け取ります。
   - ビジネスロジックの実装
   - ドメインエンティティの操作 (ドメイン層のファクトリ関数 `createXXXEntity` を使用)
   - トランザクション管理 (必要な場合)

4. **インフラストラクチャ層（Repository）**
   - **実装スタイル**: 各リポジトリは以下の要素で構成されます。
     - `XXXRepository` インターフェース: データ永続化の契約を定義します。
     - `newXXXRepository` ファクトリ関数: `QueryExecutor` (DB接続) を受け取り、インターフェースを実装したオブジェクトを返します。
     - 個別の実装関数 (例: `findYYY`, `createZZZ`): `QueryExecutor` を受け取り、具体的なDB操作 (Drizzle ORMを使用) を行う関数です。ファクトリ関数内で部分適用されます。
   - データベースとの通信
   - データの永続化と取得
   - **ドメインとスキーマのマッピング**: ドメインモデル (`@backend/domain`) とデータベーススキーマ (`@infra/drizzle/schema`) 間の差異（例: プロパティ名とカラム名）を吸収する責務を持ちます。DBから取得したデータをドメインエンティティに変換（`createXXXEntity` を使用）、またはドメインエンティティをDBスキーマに合わせた形式に変換します。
   - クエリの実行 (Drizzle ORM)

## データフロー

```txt
HTTP Request → Route (DI, Validation) → Handler (Transform, Validation) → Usecase (Business Logic) → Repository (Mapping, DB Query) → Database
```

## レイヤー間のデータフローのルール

各レイヤー間のデータの受け渡しは、以下のルールに従います。

- **Route → Handler:**
  - Route層でリクエストボディやパラメータをバリデーションします (`zValidator` と `@dtos/request` スキーマ)。
  - バリデーション済みのデータと、必要に応じてコンテキストから取得した依存オブジェクト (例: Google OAuth Client) を Handler層のメソッドに渡します。
  - Handler層から受け取ったレスポンスオブジェクトをそのままクライアントに返却します。
- **Handler → Usecase:**
  - Handler層は、Route層から受け取ったデータを、Usecase層で定義されたInput型 (例: `LoginInput`) に変換して渡します。
  - Usecase層からドメインモデルや処理結果 (`AuthOutput` など) を受け取ります。
  - 受け取った結果を、レスポンススキーマ (`@dtos/response`) を用いてバリデーション・整形し、Route層に返します。
- **Usecase → Repository:**
  - Usecase層は、ビジネスロジックを実行し、必要に応じてドメインモデル (例: `User`, `UserProvider`) を生成・操作します。
  - Repository層のメソッドには、ドメインモデルやドメインプリミティブ (例: `UserId`, `Provider`) を渡します。
  - Repository層からドメインモデルを受け取り、Handler層に返します。
- **Repository → Database:**
  - Repository層は、Usecase層から受け取ったドメインモデルを永続化可能な形式 (DBスキーマに合わせたオブジェクト) に変換したり、データベースから取得したロウデータをドメインモデル (`createXXXEntity` を使用) に変換したりします。
  - データベースとの具体的なやり取り (Drizzle ORM を用いたクエリの発行) を担当します。

## 外部サービス連携について (例: Google認証)

- 外部サービスのクライアントライブラリ (例: `google-auth-library`) の初期化や設定値 (Client IDなど) の管理は、主に **Usecase層** で行います。
- 必要な設定値 (Client IDなど) は、環境変数などから取得し、Route層のDIコンテナ設定時にUsecaseのファクトリ関数 (`newAuthUsecase` など) に注入します。
- Usecase層は、注入された設定値や内部で初期化したクライアントインスタンスを使用して、外部サービスとの通信を行います。

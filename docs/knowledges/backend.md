# バックエンドの構造について

## paths

```ts
    "paths": {
      "@backend/*": ["apps/backend/*"],
      "@frontend/*": ["apps/frontend/src/*"],
      "@dtos/*": ["packages/types/*"],
      "@hooks/*": ["apps/frontend/src/hooks/*"],
      "@infra/*": ["infra/*"],
      "@domain/*": ["apps/backend/domain/*"],
      "@components/*": ["apps/frontend/src/components/*"],
      "@packages/frontend-shared": ["packages/frontend-shared/index.ts"],
      "@packages/frontend-shared/*": ["packages/frontend-shared/*"],
      "@packages/types": ["packages/types/index.ts"]
    }
```

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
- Google認証の実装例:
  - `authUsecase.loginWithProvider`: Google OAuth認証トークンの検証とユーザー作成・ログイン処理
  - `userProviderRepository`: プロバイダー（Google）とユーザーの関連付けを管理

## 現在実装されている主要な機能

### 1. 認証・認可 (auth)
- ユーザー登録・ログイン
- JWT形式のアクセストークン発行
- リフレッシュトークンによるトークン更新
- Google OAuth認証
- 認証ミドルウェア

### 2. ユーザー管理 (user)
- ユーザー情報の取得・更新
- プロバイダー連携（user_providers）
- ユーザー削除（論理削除）

### 3. 活動記録 (activity)
- 活動カテゴリーの作成・取得・更新・削除
- デフォルト活動の設定
- ソート順の管理

### 4. 活動ログ (activityLog)
- 活動記録の作成・取得・更新・削除
- 日付ごとの活動履歴管理
- 統計情報の集計

### 5. タスク管理 (task)
- タスクの作成・取得・更新・削除
- タスクの完了状態管理
- 期限管理

### 6. 目標設定 (goal)
- 月次目標の設定・取得・更新・削除
- 活動ごとの目標値管理

### 7. 同期機能 (sync)
- オフライン時のデータ同期対応
- 重複チェック機能
- 同期キュー管理
- 同期状態の追跡

## 新規機能実装時のガイドライン・サンプル

このプロジェクトで新たな機能（エンドポイントやユースケース）を追加する際は、以下のルール・スタイルに従ってください。

### 1. 型定義は `type` を使う

- 全ての型定義（Usecase/Repository/Handlerの型など）は `type` で統一してください。
- `interface` は使わず、`type` で関数型やオブジェクト型を定義します。

```ts
// 例: Usecase型
export type TaskUsecase = {
  getTasks: (userId: UserId) => Promise<Task[]>;
  // ...他メソッド
};
```

### 2. ファクトリ関数で依存注入・集約

- 各レイヤー（Usecase/Handler/Repository）は `newXXXUsecase` や `newXXXHandler` のようなファクトリ関数で生成し、依存を引数で受け取って集約します。
- 直接オブジェクトリテラルでメソッドを定義せず、個別関数を定義し、ファクトリ関数でまとめて返す形にしてください。

```ts
// 例: Usecaseファクトリ
export function newTaskUsecase(repo: TaskRepository): TaskUsecase {
  return {
    getTasks: getTasks(repo),
    // ...他メソッド
  };
}
```

### 3. エラーハンドリングはtry-catchを使わず例外スロー

- エラーは `throw` で例外をスローし、try-catchで囲わないでください。
- エラーの捕捉・レスポンス変換はRouteやグローバルエラーハンドラで行います。

```ts
// 例: Usecase内
if (!task) throw new ResourceNotFoundError("task not found");
```

### 4. Repositoryも同様にtype＋ファクトリ＋関数分割

**重要**: Repositoryのメソッド名には必ずドメイン名を含めてください（例：`createTask`、`findTaskById`）。これは`withTx`でトランザクション内で複数のリポジトリを使用する際の名前衝突を防ぐためです。

```ts
export type TaskRepository = {
  getTasksByUserId: (userId: UserId) => Promise<Task[]>;
  createTask: (task: Task) => Promise<Task>;  // × create ではなく ○ createTask
  findTaskById: (id: TaskId) => Promise<Task | null>;  // × findById ではなく ○ findTaskById
  // ...他メソッド
  withTx: (tx: QueryExecutor) => TaskRepository;
};

export function newTaskRepository(db: QueryExecutor): TaskRepository {
  return {
    getTasksByUserId: getTasksByUserId(db),
    createTask: createTask(db),
    findTaskById: findTaskById(db),
    // ...他メソッド
    withTx: (tx) => newTaskRepository(tx),
  };
}
```

### 5. Handlerも同様にtype＋ファクトリ＋関数分割

```ts
export type TaskHandler = {
  getTasks: (userId: UserId) => Promise<GetTasksResponse>;
  // ...他メソッド
};

function getTasks(uc: TaskUsecase) {
  return async (userId: UserId) => {
    const tasks = await uc.getTasks(userId);
    // ...レスポンス変換・バリデーション
    return tasks;
  };
}

export function newTaskHandler(uc: TaskUsecase): TaskHandler {
  return {
    getTasks: getTasks(uc),
    // ...他メソッド
  };
}
```

### 6. Route層では依存注入＋バリデーション＋Handler呼び出し

```ts
export function createTaskRoute() {
  const app = new Hono();

  app.use("*", async (c, next) => {
    const db = c.env.DB;
    const repo = newTaskRepository(db);
    const uc = newTaskUsecase(repo);
    const h = newTaskHandler(uc);
    c.set("h", h);
    return next();
  });

  app.get("/", async (c) => {
    const userId = c.get("userId");
    const res = await c.var.h.getTasks(userId);
    return c.json(res);
  });
  // ...他エンドポイント
  return app;
}
```

### 7. サンプル構成

```txt
feature/
  ├─ task/
  │    ├─ taskRoute.ts
  │    ├─ taskHandler.ts
  │    ├─ taskUsecase.ts
  │    ├─ taskRepository.ts
  │    └─ index.ts
```

### 8. テストもtype＋ファクトリ＋依存注入を前提に記述

```ts
import { newTaskUsecase } from "..";
import { mock, instance } from "ts-mockito";
import { describe, it, expect } from "vitest";

describe("TaskUsecase", () => {
  it("getTasks: success", async () => {
    const repo = mock<TaskRepository>();
    const usecase = newTaskUsecase(instance(repo));
    // ...テスト本体
  });
});
```

---

このガイドラインに従うことで、既存コードベースと一貫した実装ができます。  
サンプルは `feature/task/` ディレクトリの各ファイルを参照してください。

必要に応じて、`auth`や`activity`など他のfeatureディレクトリの実装も参考にしてください。

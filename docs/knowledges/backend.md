# バックエンドの構造について

## アーキテクチャ概要

本プロジェクトのバックエンドは、クリーンアーキテクチャの原則に基づいて設計されています。主に以下の4つのレイヤーで構成されています：

1. **プレゼンテーション層（Route）**
   - HTTPリクエストの受付とルーティング
   - リクエストのバリデーション
   - 依存関係の注入
   - レスポンスの返却

2. **アプリケーション層（Handler）**
   - リクエスト/レスポンスの変換
   - エラーハンドリング
   - レスポンスのバリデーション

3. **ユースケース層（Usecase）**
   - ビジネスロジックの実装
   - ドメインエンティティの操作
   - トランザクション管理

4. **インフラストラクチャ層（Repository）**
   - データベースとの通信
   - データの永続化
   - クエリの実行

## データフロー

```txt
HTTP Request → Route → Handler → Usecase → Repository → Database
```

## 特徴的な実装

- **依存性注入パターン**
  - 各レイヤー間の依存関係を明確に
  - テスト容易性の向上
  - モジュール性の確保

- **型安全性**
  - TypeScriptによる厳密な型チェック
  - 実行時エラーの防止
  - 開発効率の向上

- **エラーハンドリング**
  - 統一されたエラー処理
  - 適切なエラーメッセージの提供
  - エラーの追跡可能性

- **トランザクション管理**
  - データ整合性の確保
  - 複数操作の原子性保証
  - エラー時のロールバック

## エラーハンドリング

### 1. エラーの種類

- **AppError**
  - アプリケーション全体で使用する基本エラー
  - エラーメッセージとステータスコードを持つ

- **AuthError**
  - 認証関連のエラー
  - 未認証やトークン無効などのケース

- **DomainValidateError**
  - ドメインモデルのバリデーションエラー
  - データの整合性チェック失敗時

- **ResourceNotFoundError**
  - リソースが見つからない場合のエラー
  - データベース検索結果が空の場合

- **SqlExecutionError**
  - データベース操作のエラー
  - SQL実行時のエラー

### 2. エラーの使用方法

```ts
// エラーの定義
throw new AuthError("unauthorized");

// エラーのキャッチ
try {
  // 処理
} catch (e) {
  if (e instanceof AuthError) {
    // 認証エラーの処理
  }
}
```

## 認証・認可

### 1. 認証ミドルウェア

- **実装方法**

```ts
  app.use("/users/*", authMiddleware);
```

- **認証フロー**
  1. リクエストヘッダーからJWTトークンを取得
  2. トークンの検証
  3. ペイロードからユーザーIDを取得
  4. コンテキストにユーザー情報を設定

### 2. 認可の実装

- ルートレベルでの認可
- リソースレベルでの認可
- ユーザーIDによるアクセス制御

## ドメインモデル

### 1. ドメインモデルの設計原則

- **値オブジェクト（Value Object）**
  - プリミティブな値をドメイン固有の型として定義
  - 型安全性の確保
  - バリデーションの集中管理

```ts
  // 例：TaskIdの実装
  export const taskIdSchema = z.string().uuid().brand<"TaskId">();
  export type TaskId = z.infer<typeof taskIdSchema>;
```

- **エンティティ（Entity）**
  - ドメインオブジェクトの状態と振る舞いを定義
  - 不変性（Immutability）の確保
  - バリデーションの実装

```ts
  // 例：Taskの実装
  const BaseTaskSchema = z.object({
    id: taskIdSchema,
    userId: userIdSchema,
    title: z.string(),
    // ...
  });
```

- **ファクトリ（Factory）**
  - オブジェクトの作成ロジックを集約
  - バリデーションの実行
  - 不変条件の保証

```ts
  // 例：Taskの作成
  export function createTaskEntity(params: TaskInput): Task {
    const parsedEntity = TaskSchema.safeParse(params);
    if (parsedEntity.error) {
      throw new DomainValidateError("createTaskEntity: invalid params");
    }
    return parsedEntity.data;
  }
```

### 2. 実装のガイドライン

1. **スキーマ定義**
   - Zodを使用したスキーマ定義
   - 型安全性の確保
   - バリデーションルールの明確化

2. **エラーハンドリング**
   - ドメイン固有のエラー定義
   - バリデーションエラーの適切な処理
   - エラーメッセージの明確化

3. **不変条件**
   - オブジェクトの状態変更を制御
   - バリデーションによる整合性の確保
   - ドメインルールの実装

4. **テスト容易性**
   - 純粋関数の使用
   - 副作用の分離
   - モックの容易さ

### 3. 新規ドメインモデルの作成手順

1. **要件分析**
   - ドメインの概念を特定
   - 必要な値オブジェクトを定義
   - エンティティの属性を決定

2. **実装**
   - スキーマの定義
   - バリデーションの実装
   - ファクトリ関数の作成
   - テストの作成

3. **レビュー**
   - ドメインルールの適切な実装
   - 型安全性の確保
   - テストの網羅性

## 機能追加の手順

### 1. 新機能の追加フロー

1. **要件分析**
   - 機能の目的を明確化
   - 必要なデータモデルを特定
   - APIエンドポイントを設計

2. **実装手順**
   - ドメインモデルの作成/修正
   - Repositoryインターフェースの定義
   - Usecaseの実装
   - Handlerの実装
   - Routeの実装
   - テストの作成

3. **レビュー項目**
   - コードの品質
   - テストの網羅性
   - セキュリティ要件
   - パフォーマンスへの影響

### 2. 既存機能の修正フロー

1. **影響範囲の特定**
   - 修正対象の特定
   - 依存関係の確認
   - テストケースの確認

2. **修正手順**
   - テストの作成/修正
   - コードの修正
   - テストの実行
   - ドキュメントの更新

3. **レビュー項目**
   - 後方互換性
   - パフォーマンスへの影響
   - セキュリティへの影響

## テストコードのルール

### 1. テスト環境の設定

- **テストデータベース**
  - PGliteを使用したインメモリデータベース
  - テスト実行前にマイグレーションを実行
  - 各テストケース実行後にデータベースをリセット

- **テストデータ**
  - `test.setup.ts`で共通のテストデータを定義
  - 各テストケースで必要なデータを追加
  - テストデータは独立して管理

### 2. テストの種類と構造

- **Routeテスト** (`taskRoute.test.ts`)
  - HTTPリクエスト/レスポンスのテスト
  - エンドポイントごとのテストケース
  - ステータスコードとレスポンス内容の検証
  - 認証ミドルウェアのモック化

- **Usecaseテスト** (`taskUsecase.test.ts`)
  - ビジネスロジックのテスト
  - 依存関係のモック化（Repository）
  - 正常系・異常系のテストケース
  - エラーハンドリングの検証

### 3. テストの記述ルール

- **テストケースの構造**

```ts
  describe("機能名", () => {
    type TestCase = {
      name: string;
      // 入力パラメータ
      // 期待する結果
      // エラーケースの情報
    };

    const testCases: TestCase[] = [
      {
        name: "正常系ケース",
        // ...
      },
      {
        name: "異常系ケース",
        // ...
      }
    ];

    testCases.forEach(({ name, ... }) => {
      it(name, async () => {
        // テストの実装
      });
    });
  });
```

- **命名規則**
  - テストケース名: `機能名_テスト条件_期待結果`
  - テストファイル名: `テスト対象.test.ts`

### 4. テストの実行と検証

- **テストの実行**
  - 各テストケースは独立して実行可能
  - テストデータベースは自動的にリセット
  - モックは各テストケースでリセット

- **検証項目**
  - 正常系: 期待する結果の確認
  - 異常系: エラーの種類とメッセージの確認
  - 依存関係の呼び出し回数の確認

### 5. モックの使用方法

- **Repositoryのモック**

```typescript
  const repo = mock<TaskRepository>();
  const usecase = newTaskUsecase(instance(repo));
```

- **モックの設定**

```typescript
  when(repo.getTasksByUserId(userId)).thenResolve(mockReturn);
```

- **モックの検証**

```typescript
  verify(repo.getTasksByUserId(userId)).once();
```

### 6. エラーハンドリングのテスト

- **エラーケースの定義**

```typescript
  expectError?: {
    getTask?: Error;
    taskNotFound?: ResourceNotFoundError;
  };
```

- **エラーの検証**

```typescript
  await expect(usecase.getTask(userId, taskId)).rejects.toThrow(Error);
```

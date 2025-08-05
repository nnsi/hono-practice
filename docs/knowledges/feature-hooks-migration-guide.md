# Feature Hooks移行ガイド

このドキュメントでは、既存のWeb版feature hooksを共通化されたhooksに移行する方法を説明します。

## 移行の概要

1. 既存のフックの実装を保持（.old.tsとしてリネーム）
2. 新しい実装を作成（共通化されたフックを使用）
3. テストの実行と動作確認
4. 段階的な切り替え

## 移行パターン

### 基本パターン

```typescript
// 1. 必要なアダプターとフックをインポート
import { 
  createWebFormAdapter,
  createWebNavigationAdapter,
  createWebNotificationAdapter,
} from "@packages/frontend-shared/adapters";
import { createUseXxx } from "@packages/frontend-shared/hooks/feature";

// 2. 既存の依存関係を取得
export const useXxx = () => {
  // 既存のhooks/API/状態管理

  // 3. アダプターと依存関係を作成
  const dependencies = {
    form: createWebFormAdapter(form, useFieldArray),
    navigation: createWebNavigationAdapter(router),
    notification: createWebNotificationAdapter(),
    // その他の依存関係
  };

  // 4. 共通化されたフックを使用
  return createUseXxx(dependencies, ...args);
};
```

## 具体的な移行例

### useActivityEdit

```typescript
// apps/frontend/src/hooks/feature/activity/useActivityEdit.ts

// Before: 直接実装
const form = useForm<UpdateActivityRequest>({...});
const updateActivity = useUpdateActivity();
// ... 多くのロジック

// After: 共通化されたフックを使用
const dependencies = {
  form: createWebFormAdapter(form, useFieldArray),
  notification: createWebNotificationAdapter(),
  api: {
    updateActivity: async (params) => await updateActivity.mutateAsync(params),
    // 他のAPI
  },
};

return createUseActivityEdit(dependencies, activity, onClose);
```

### useDailyPage

```typescript
// オフライン同期ロジックの抽象化
const dependencies = {
  network: createWebNetworkAdapter(),
  dateStore: { date, setDate },
  storage: {
    getOfflineActivityLogs: async (date) => {
      // localStorage実装
    },
    addStorageListener: (callback) => {
      // イベントリスナー実装
    },
  },
};
```

### useTasksPage

```typescript
// React Queryとの統合
const commonResult = createUseTasksPage(dependencies);

return {
  ...commonResult,
  // React Queryのデータで上書き
  isTasksLoading: activeTasksQuery.isLoading,
  tasks: activeTasksQuery.data,
};
```

## アダプターの使用

### FormAdapter

react-hook-formをラップ：

```typescript
const form = useForm<T>({ resolver, defaultValues });
const formAdapter = createWebFormAdapter(form, useFieldArray);
```

### NavigationAdapter

React Routerをラップ：

```typescript
const router = useRouter();
const navigationAdapter = createWebNavigationAdapter(router);
```

### NotificationAdapter

トースト通知をラップ：

```typescript
const { toast } = useToast();
const notificationAdapter = createWebNotificationAdapter();
notificationAdapter.setToastCallback(toast);
```

## 注意事項

### React Queryとの統合

共通化されたフックは純粋な状態管理を行うため、React Queryを使用している場合は：

1. API呼び出しをラップして依存関係として提供
2. React Queryのローディング状態やデータで上書き
3. キャッシュ無効化の実装を提供

### 型安全性

TypeScriptの型推論を活用：

```typescript
// 型を明示的に指定
const dependencies: ActivityEditDependencies = {
  // ...
};
```

### エラーハンドリング

エラーは共通化されたフック内で処理されるため、通知アダプターを適切に設定すること。

## テスト

1. 既存のテストが引き続き動作することを確認
2. 統合テストで実際の動作を検証
3. パフォーマンステストで影響がないことを確認

## 段階的移行

1. `.new.ts`ファイルとして新実装を作成
2. Feature flagで切り替え可能にする
3. 本番環境で段階的にロールアウト
4. 問題がなければ旧実装を削除

## トラブルシューティング

### よくある問題

1. **型エラー**: アダプターの型が合わない
   - 解決: 明示的な型指定またはas演算子の使用

2. **非同期処理**: React Queryとの不整合
   - 解決: 適切なデータマッピング

3. **イベントリスナー**: メモリリーク
   - 解決: クリーンアップ関数の確実な実装

## まとめ

この移行により：
- コードの重複が削減される
- ビジネスロジックがプラットフォームから独立
- テストが容易になる
- 新機能の追加が簡単になる
# Feature Hooks

このディレクトリには、Web/Mobile共通のビジネスロジックを含むfeature層のフックが配置されています。

## 設計方針

- ビジネスロジックをプラットフォーム固有の実装から分離
- Adapter パターンを使用してプラットフォーム依存をDI（依存性注入）
- テスタブルで再利用可能な設計

## 実装済みフック

- `createUseActivityEdit` - アクティビティ編集機能
- `createUseDailyPage` - デイリーページのロジック
- `createUseTasksPage` - タスク管理のロジック
- `createUseLogin` - ログイン処理
- `createUseUserSettings` - ユーザー設定管理

## createUseActivityEdit

アクティビティの編集機能を提供する共通フック。

### 使用例（Web）

```typescript
import { useForm, useFieldArray } from "react-hook-form";
import { createWebFormAdapter } from "@packages/frontend-shared/adapters";
import { createUseActivityEdit } from "@packages/frontend-shared/hooks/feature";
import { useToast } from "@/components/ui/use-toast";

export const useActivityEdit = (activity: GetActivityResponse | null, onClose: () => void) => {
  const form = useForm<UpdateActivityRequest>({
    resolver: zodResolver(UpdateActivityRequestSchema),
  });
  
  const { toast } = useToast();
  const updateActivity = useUpdateActivity();
  
  const dependencies = {
    form: createWebFormAdapter(form, useFieldArray),
    notification: {
      toast: (options) => toast(options),
      alert: async (title, message) => { window.alert(message || title); },
      confirm: async (title, message) => window.confirm(message || title),
    },
    api: {
      updateActivity: async (params) => {
        await updateActivity.mutateAsync(params);
      },
      // ... other API methods
    },
  };

  return createUseActivityEdit(dependencies, activity, onClose);
};
```

### 使用例（React Native）

```typescript
import { createReactNativeFormAdapter, createReactNativeNotificationAdapter } from "@packages/frontend-shared/adapters";
import { createUseActivityEdit } from "@packages/frontend-shared/hooks/feature";
import { Alert } from "react-native";

export const useActivityEdit = (activity: GetActivityResponse | null, onClose: () => void) => {
  const form = createReactNativeFormAdapter<UpdateActivityRequest>();
  
  const dependencies = {
    form,
    notification: createReactNativeNotificationAdapter(Alert),
    file: {
      pickImage: async () => {
        // Use react-native-image-picker
        return ImagePicker.launchImageLibrary();
      },
      createFormData: (file) => {
        const formData = new FormData();
        formData.append('file', {
          uri: file.uri,
          type: file.type || 'image/jpeg',
          name: file.name || 'photo.jpg',
        } as any);
        return formData;
      },
    },
    api: {
      // API implementation
    },
  };

  return createUseActivityEdit(dependencies, activity, onClose);
};
```

### 機能

- フォーム管理（バリデーション、エラーハンドリング）
- アクティビティの更新・削除
- 種類（kinds）の追加・削除
- アイコンのアップロード・削除
- プラットフォーム固有のファイル選択

### 依存関係

- `FormAdapterWithFieldArray`: フォーム管理の抽象化
- `NotificationAdapter`: 通知システムの抽象化
- `FileAdapter`: ファイル操作の抽象化（オプション）
- API実装: CRUD操作のためのAPI関数

## テスト

```bash
npm test packages/frontend-shared/hooks/feature/useActivityEdit.test.ts
```

## createUseDailyPage

デイリーページの統合ロジックを提供：
- 日付管理
- アクティビティログとタスクの取得
- オフライン同期サポート
- ダイアログ状態管理

## createUseTasksPage

タスク管理の高度なロジック：
- タスクの時間軸によるグループ化（8カテゴリ）
- アクティブ/アーカイブタブ管理
- フィルタリング（完了済み、未来のタスク）
- 自動ソート

## createUseLogin

認証処理の統一実装：
- 通常のログイン（ID/パスワード）
- Google認証（Web/Mobile対応）
- フォームバリデーション
- エラーハンドリング

## createUseUserSettings

ユーザー設定管理：
- プロフィール情報
- Google連携管理
- ログアウト処理
- アカウント削除（オプション）
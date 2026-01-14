# Frontend Shared リファクタリングガイド

## 概要

frontend/mobile間でロジックを共通化し、UIはプラットフォーム固有で実装するパターン。

## 目指す構造

```
packages/frontend-shared/hooks/feature/
  use{Feature}.ts              ← ビジネスロジック + UIロジック（共通）

apps/frontend/
  hooks/feature/{feature}/use{Feature}.ts     ← アダプター設定
  components/{feature}/
    {Component}.tsx            ← 繋ぎ役（シンプル）
    {Component}View.tsx        ← 純粋View（frontend固有UI）

apps/mobile/
  hooks/feature/{feature}/use{Feature}.ts     ← アダプター設定
  components/{feature}/
    {Component}.tsx            ← 繋ぎ役（シンプル）
    {Component}View.tsx        ← 純粋View（mobile固有UI）
```

## 手順

### Step 1: shared hooksのリファクタリング

#### 1.1 戻り値の型定義を追加

```typescript
// packages/frontend-shared/hooks/feature/use{Feature}.ts

// グループ化された戻り値の型を定義
export type {Feature}FormProps = {
  form: FormAdapterWithFieldArray<{RequestType}>;
  fields: { id?: string; /* ... */ }[];
  isPending: boolean;
};

export type {Feature}Actions = {
  onSubmit: () => void;
  onDelete: () => Promise<void>;
  // その他のアクション
};

// 必要に応じて追加のグループ
export type {Feature}SomeProps = {
  value: SomeType;
  onChange: (value: SomeType) => Promise<void>;
};
```

#### 1.2 戻り値をグループ化

```typescript
// Before
return {
  form,
  fields,
  isPending,
  onSubmit,
  onDelete,
  handleSomething,
  someValue,
  onSomeChange,
};

// After
return {
  formProps: {
    form,
    fields,
    isPending,
  } as {Feature}FormProps,
  actions: {
    onSubmit: form.handleSubmit(onSubmit),
    onDelete: handleDelete,
    // ...
  } as {Feature}Actions,
  someProps: {
    value: someValue,
    onChange: onSomeChange,
  } as {Feature}SomeProps,
};
```

### Step 2: テストの更新

shared hooksのテストを新しいグループ化されたAPIに更新。

```typescript
// Before
await result.current.onSubmit();
await result.current.handleDelete();
result.current.handleAddKind();

// After
await result.current.actions.onSubmit();
await result.current.actions.onDelete();
result.current.actions.onAddKind();
```

### Step 3: frontend/mobile のアダプター設定

#### 3.1 frontend用

```typescript
// apps/frontend/src/hooks/feature/{feature}/use{Feature}.ts
import { createUse{Feature} } from "@packages/frontend-shared/hooks/feature";
import { createWebFormAdapter, createWebNotificationAdapter } from "@packages/frontend-shared/adapters";

export const use{Feature} = (/* params */) => {
  const form = useForm<{RequestType}>({
    resolver: zodResolver({Schema}),
    defaultValues: /* ... */,
  });

  const dependencies = {
    form: createWebFormAdapter<{RequestType}>(form as never, useFieldArray),
    notification: createWebNotificationAdapter(),
    api: {
      // API mutations をラップ
    },
  };

  // toast callback設定
  if ("setToastCallback" in dependencies.notification) {
    dependencies.notification.setToastCallback(toast);
  }

  const commonHook = createUse{Feature}(dependencies, /* params */);

  return {
    ...commonHook,
    form, // react-hook-formインスタンスを直接渡す
  };
};
```

#### 3.2 mobile用

```typescript
// apps/mobile/src/hooks/feature/{feature}/use{Feature}.ts
import { createUse{Feature} } from "@packages/frontend-shared/hooks/feature";
import { createReactNativeFormAdapter, createReactNativeNotificationAdapter } from "@packages/frontend-shared/adapters";

export const use{Feature} = (/* params */) => {
  const form = useForm<{RequestType}>({
    resolver: zodResolver({Schema}),
    defaultValues: /* ... */,
  });

  const dependencies = {
    form: createReactNativeFormAdapter<{RequestType}>(form as never, useFieldArray),
    notification: createReactNativeNotificationAdapter(),
    api: {
      // API呼び出しをラップ
    },
  };

  const commonHook = createUse{Feature}(dependencies, /* params */);

  return {
    ...commonHook,
    form,
  };
};
```

### Step 4: Viewコンポーネントの作成

#### 4.1 frontend View

```typescript
// apps/frontend/src/components/{feature}/{Component}View.tsx
import type { UseFormReturn } from "react-hook-form";
import type { {Feature}Actions, {Feature}SomeProps } from "@packages/frontend-shared/hooks/feature/use{Feature}";

export type {Component}ViewProps = {
  open: boolean;
  form: UseFormReturn<{RequestType}>;
  fields: { id?: string; /* ... */ }[];
  isPending: boolean;
  someProps: {Feature}SomeProps;
  actions: {Feature}Actions;
  onClose: () => void;
};

export function {Component}View({
  open,
  form,
  fields,
  isPending,
  someProps,
  actions,
  onClose,
}: {Component}ViewProps) {
  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      {/* UI実装 */}
    </Dialog>
  );
}
```

#### 4.2 mobile View

```typescript
// apps/mobile/src/components/{feature}/{Component}View.tsx
import type { UseFormReturn } from "react-hook-form";
import type { {Feature}Actions, {Feature}SomeProps } from "@packages/frontend-shared/hooks/feature/use{Feature}";

export type {Component}ViewProps = {
  open: boolean;
  form: UseFormReturn<{RequestType}>;
  fields: { id?: string; /* ... */ }[];
  isPending: boolean;
  someProps: {Feature}SomeProps;
  actions: {Feature}Actions;
  onClose: () => void;
};

export function {Component}View({
  open,
  form,
  fields,
  isPending,
  someProps,
  actions,
  onClose,
}: {Component}ViewProps) {
  return (
    <Modal visible={open} onRequestClose={onClose}>
      {/* React Native UI実装 */}
    </Modal>
  );
}
```

### Step 5: 繋ぎ役コンポーネントの作成

```typescript
// apps/frontend/src/components/{feature}/{Component}.tsx
// または
// apps/mobile/src/components/{feature}/{Component}.tsx

export const {Component} = ({ open, onClose, /* params */ }) => {
  const { form, formProps, someProps, actions } = use{Feature}(/* params */);

  if (!/* data */) return null;

  return (
    <{Component}View
      open={open}
      form={form}
      fields={formProps.fields}
      isPending={formProps.isPending}
      someProps={someProps}
      actions={actions}
      onClose={onClose}
    />
  );
};
```

## グループ化のガイドライン

### グループの分け方

| グループ | 含めるもの |
|---------|-----------|
| `formProps` | form, fields, isPending, errors |
| `actions` | onSubmit, onDelete, onAdd*, onRemove*, onClick* |
| `{domain}Props` | ドメイン固有の値とハンドラ（例: iconProps） |

### 命名規則

- グループ名: `{purpose}Props` または `actions`
- 型名: `{Feature}{Purpose}Props` または `{Feature}Actions`
- ハンドラ: グループ内では `on{Action}` （例: `actions.onSubmit`）

## チェックリスト

### shared hooks
- [ ] 戻り値の型定義を追加（`{Feature}FormProps`, `{Feature}Actions`, etc.）
- [ ] 戻り値をグループ化
- [ ] テストを新APIに更新

### frontend
- [ ] `hooks/feature/{feature}/use{Feature}.ts` 作成/更新
- [ ] `components/{feature}/{Component}View.tsx` 作成
- [ ] `components/{feature}/{Component}.tsx` を繋ぎ役として整理
- [ ] テストを新APIに更新

### mobile
- [ ] `hooks/feature/{feature}/use{Feature}.ts` 作成/更新
- [ ] `components/{feature}/{Component}View.tsx` 作成
- [ ] `components/{feature}/{Component}.tsx` を繋ぎ役として整理

### 検証
- [ ] `npm run tsc` 通過
- [ ] `npm run test-once` 通過
- [ ] `npm run fix` 実行

## 対象コンポーネント一覧

### 完了
- [x] useActivityEdit / ActivityEditDialog

### 未対応（要リファクタリング）

#### feature hooks（UIロジックを含む - リファクタリング対象）

##### Activity関連
- [ ] useActivityLogEdit / ActivityLogEditDialog
- [ ] useActivityRegistPage / ActivityRegistPage
- [ ] useActivityCalendar / ActivityCalendar
- [ ] useActivityStats / ActivityStats
- [ ] useDailyActivityCreate / DailyActivityLogCreateDialog

##### Daily関連
- [ ] useDailyPage / DailyPage
- [ ] useDailyTaskActions / DailyTaskActions

##### Task関連
- [ ] useTasksPage / TasksPage
- [ ] useTaskActions / TaskActions
- [ ] useTaskEditForm / TaskEditForm
- [ ] useTaskGroup / TaskGroup

##### Goal関連
- [ ] useNewGoalPage / NewGoalPage
- [ ] useNewGoalDialog / NewGoalDialog
- [ ] useNewGoalCard / NewGoalCard
- [ ] useNewGoalSlot / NewGoalSlot
- [ ] useGoalDetailModal / GoalDetailModal

##### Auth/User関連
- [ ] useLogin / LoginPage
- [ ] useCreateUser / CreateUserPage
- [ ] useAuthInitializer / AuthInitializer
- [ ] useUserSettings / UserSettingsPage
- [ ] useAppSettings / AppSettings

### リファクタリング不要（データフェッチ/ユーティリティ）

以下はViewとの結合がないため、現状維持でOK：

- useActivities（データフェッチ）
- useActivityLogs（データフェッチ）
- useActivityMutations（API mutation）
- useActivityBatchData（データフェッチ）
- useActivityIcon（ユーティリティ）
- useApiKeys（データフェッチ）
- useAuth（認証状態）
- useGoals（データフェッチ）
- useGlobalDate（グローバル状態）
- useNetworkStatus（ネットワーク状態）
- useSubscription（データフェッチ）
- useTasks（データフェッチ）
- useTimer（ユーティリティ）

## 参考: ActivityEditDialogの実装例

### shared hooks
`packages/frontend-shared/hooks/feature/useActivityEdit.ts`

### frontend
- `apps/frontend/src/hooks/feature/activity/useActivityEdit.ts`
- `apps/frontend/src/components/activity/ActivityEditDialog.tsx`
- `apps/frontend/src/components/activity/ActivityEditDialogView.tsx`

### mobile
- `apps/mobile/src/hooks/feature/activity/useActivityEdit.ts`
- `apps/mobile/src/components/activity/ActivityEditDialog.tsx`
- `apps/mobile/src/components/activity/ActivityEditDialogView.tsx`

# 画面のどこからでもActivityLogを新規登録できる機能

## 概要

FAB（Floating Action Button）をAuthenticatedLayoutに配置し、どの画面からでも1タップでActivityLog登録ダイアログを開けるようにする。

## 設計方針

- **FAB + Context方式**を採用
- 既存の`DailyActivityLogCreateDialog`を完全再利用
- `DateProvider`と同様のパターンでProvider作成

## UI配置

```
┌──────────────────────────────────────┐
│                        [hamburger]   │  ← 右上 z-50
│                                      │
│         <Outlet />                   │
│                                      │
│                              [FAB]   │  ← 右下 z-40 (フッターの上)
├──────────────────────────────────────┤
│ [Actiko] [Daily] [Stats] [Goal] [Tasks] │
└──────────────────────────────────────┘
```

FAB位置: `fixed bottom-20 right-4 z-40`（フッターの56px上）

## 実装ステップ

### Step 1: QuickActivityLogProvider作成

**新規ファイル:** `apps/frontend/src/providers/QuickActivityLogProvider.tsx`

```typescript
type QuickActivityLogContextValue = {
  isOpen: boolean;
  openDialog: () => void;
  closeDialog: () => void;
};
```

### Step 2: QuickActivityLogFABコンポーネント作成

**新規ファイル:** `apps/frontend/src/components/global/QuickActivityLogFAB.tsx`

- PlusIconボタン
- 右下固定配置
- クリックで`openDialog`呼び出し

### Step 3: GlobalActivityLogCreateDialogコンポーネント作成

**新規ファイル:** `apps/frontend/src/components/global/GlobalActivityLogCreateDialog.tsx`

- `DailyActivityLogCreateDialog`をラップ
- 日付選択UIを追加

### Step 4: AuthenticatedLayoutに統合

**修正ファイル:** `apps/frontend/src/components/root/AuthenticatedLayout.tsx`

- `DateProvider`の子として`QuickActivityLogProvider`を配置
- FABとダイアログコンポーネントを追加

```tsx
<DateProvider>
  <QuickActivityLogProvider>
    <Outlet />
    <QuickActivityLogFAB />
    <GlobalActivityLogCreateDialog />
  </QuickActivityLogProvider>
</DateProvider>
```

## 修正対象ファイル一覧

| ファイル | 操作 |
|---------|------|
| `apps/frontend/src/providers/QuickActivityLogProvider.tsx` | 新規作成 |
| `apps/frontend/src/components/global/QuickActivityLogFAB.tsx` | 新規作成 |
| `apps/frontend/src/components/global/GlobalActivityLogCreateDialog.tsx` | 新規作成 |
| `apps/frontend/src/components/root/AuthenticatedLayout.tsx` | 修正 |

## 再利用する既存コンポーネント

- `DailyActivityLogCreateDialog` - Activity選択ダイアログ
- `ActivityLogCreateDialog` - 数量入力ダイアログ
- `useDailyActivityCreate` - Activity選択ロジック

## 日付の扱い

- **デフォルト**: 今日の日付
- **選択可能**: Activity選択ダイアログに日付ピッカーを表示し、変更可能にする

### 実装方法

`GlobalActivityLogCreateDialog`に日付選択UIを追加：
- `Input type="date"`（既存パターン：TaskCreateDialogと同様）
- 初期値は今日の日付（`dayjs().format("YYYY-MM-DD")`）
- 選択した日付を`DailyActivityLogCreateDialog`に渡す

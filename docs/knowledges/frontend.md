# フロントエンド（frontend）の構造について

## 技術スタック

### コアライブラリ
- **React 19**: UIライブラリ
- **TypeScript**: 型安全な開発
- **Vite**: ビルドツール + PWAサポート（vite-plugin-pwa）

### ルーティング・状態管理
- **TanStack Router**: ファイルベースのルーティング
- **TanStack Query**: サーバー専用データの取得（APIキー、サブスクリプション等のみ）
- **Dexie.js + useLiveQuery**: ローカルDB（IndexedDB）のリアクティブ読み取り

### UI・スタイリング
- **Tailwind CSS**: ユーティリティファーストCSS
- **Lucide React**: アイコンライブラリ
- **Victory**: チャートライブラリ

### 開発ツール
- **Biome**: リンター・フォーマッター
- **Vitest**: テストフレームワーク

## アーキテクチャ: オフラインファースト

frontendの最大の特徴は**オフラインファースト設計**。全データはローカルDB（Dexie.js/IndexedDB）を唯一の真実の源とし、バックグラウンドでサーバーと同期する。

### データフロー

```
[ユーザー操作]
    ↓
[Dexie Repository] → IndexedDBに書き込み (_syncStatus: "pending")
    ↓
[useLiveQuery] → UIにリアクティブ反映（即座）
    ↓
[syncEngine] → バックグラウンドでサーバー同期 → _syncStatus: "synced"
```

### 重要な原則
- DB操作は必ず**Dexie repository**経由（直接API fetch禁止）
- `useLiveQuery` でリアクティブ読み取り（useEffectでのフェッチ不要）
- TanStack Queryはサーバー専用データのみ（APIキー、サブスクリプション等）
- サーバー計算値を表示に直接使わない（ローカルactivityLogsから`calculateGoalBalance()`等で算出）

## Dexieスキーマ

```typescript
// src/db/schema.ts
class ActikoDatabase extends Dexie {
  activityLogs: Table<DexieActivityLog>;      // id, activityId, date, _syncStatus, [date+activityId]
  activities: Table<DexieActivity>;           // id, orderIndex, _syncStatus
  activityKinds: Table<DexieActivityKind>;    // id, activityId, _syncStatus
  goals: Table<DexieGoal>;                    // id, activityId, _syncStatus
  tasks: Table<DexieTask>;                    // id, _syncStatus, startDate, dueDate
  activityIconBlobs: Table;                   // activityId (base64 + mimeType)
  activityIconDeleteQueue: Table;             // activityId
  authState: Table<DexieAuthState>;           // id (userId, lastLoginAt)
}
```

全ドメインレコードには `_syncStatus: "pending" | "synced" | "failed"` が付与される（`Syncable<T>`型）。

## ディレクトリ構造

```txt
apps/frontend/src/
├── components/           # UIコンポーネント（機能別）
│   ├── actiko/          # 活動記録メイン画面
│   ├── common/          # 共通UI（ModalOverlay, DatePicker, EmojiPicker）
│   ├── csv/             # CSVインポート/エクスポート
│   ├── daily/           # 日次記録画面
│   ├── goal/            # 目標管理画面
│   ├── root/            # ルートレベル（認証フォーム）
│   ├── setting/         # 設定画面（APIキー管理含む）
│   ├── stats/           # 統計ダッシュボード
│   └── tasks/           # タスク管理画面
├── db/                  # Dexie DBスキーマ・リポジトリ
│   ├── schema.ts        # Dexieスキーマ定義
│   ├── activityRepository.ts
│   ├── activityLogRepository.ts
│   ├── goalRepository.ts
│   └── taskRepository.ts
├── hooks/               # カスタムフック
│   ├── useAuth.ts       # ログイン/ログアウト/オフライン認証
│   ├── useActivities.ts # useLiveQuery → activities
│   ├── useActivityKinds.ts
│   ├── useActivityLogs.ts
│   ├── useGoals.ts
│   ├── useTasks.ts
│   ├── useTimer.ts      # タイマー機能
│   ├── useCSVImport.ts  # CSVインポート
│   ├── useCSVExport.ts  # CSVエクスポート
│   ├── useApiKeys.ts    # APIキー管理（TanStack Query）
│   ├── useSubscription.ts # サブスクリプション（TanStack Query）
│   └── useSyncEngine.ts # 同期ライフサイクル管理
├── sync/                # 同期エンジン
│   ├── syncEngine.ts    # 同期コーディネーター・自動同期
│   ├── initialSync.ts   # 初回同期（ログイン時）
│   ├── syncActivities.ts
│   ├── syncActivityLogs.ts
│   ├── syncGoals.ts
│   ├── syncTasks.ts
│   └── webPlatformAdapters.ts
├── routes/              # TanStack Routerルート定義
│   ├── __root.tsx
│   ├── index.tsx
│   ├── actiko.tsx
│   ├── daily.tsx
│   ├── stats.tsx
│   ├── goals.tsx
│   ├── tasks.tsx
│   └── settings.tsx
├── api/                 # API関連
├── types/               # 型定義
├── utils/               # ユーティリティ（apiClient等）
├── main.tsx             # エントリーポイント
└── routeTree.gen.ts     # 自動生成ルート定義
```

## コンポーネント設計: コロケーション型フック

各機能フォルダで**コンポーネント（.tsx）とフック（use*.ts）をコロケーション**する。

```txt
components/daily/
├── DailyPage.tsx          # UI表示のみ（JSX）
├── useDailyPage.ts        # ロジック（状態、ハンドラ、データ取得）
├── EditLogDialog.tsx
├── useEditLogDialog.ts
└── index.ts               # バレルエクスポート
```

### 原則
- `.tsx` = 純粋なJSX、ロジックなし
- `use*.ts` = 全ての状態管理、イベントハンドラ、データ取得
- フックの戻り値型変更 → フック側で先に変更 → コンポーネント側で使用

### 実装パターン

```typescript
// useDailyPage.ts
export const useDailyPage = () => {
  // Dexieからリアクティブ読み取り
  const activities = useLiveQuery(() =>
    db.activities.orderBy("orderIndex").filter(a => !a.deletedAt).toArray()
  );

  const [editDialogOpen, setEditDialogOpen] = useState(false);

  const handleLogClick = (log: DexieActivityLog) => {
    setEditDialogOpen(true);
  };

  return { activities: activities ?? [], editDialogOpen, handleLogClick, setEditDialogOpen };
};
```

```typescript
// DailyPage.tsx
export const DailyPage = () => {
  const { activities, editDialogOpen, handleLogClick, setEditDialogOpen } = useDailyPage();

  return (
    <div>
      {activities.map(a => <ActivityCard key={a.id} activity={a} onClick={handleLogClick} />)}
    </div>
  );
};
```

## ルーティング

TanStack Routerによるファイルベースルーティング:

| ルート | 画面 |
|-------|------|
| `__root.tsx` | ルートレイアウト（認証/非認証の分岐） |
| `index.tsx` | リダイレクト先決定 |
| `actiko.tsx` | 活動記録メイン画面 |
| `daily.tsx` | 日次記録画面 |
| `stats.tsx` | 統計画面 |
| `goals.tsx` | 目標管理画面 |
| `tasks.tsx` | タスク管理画面 |
| `settings.tsx` | 設定画面 |

## 同期アーキテクチャ

### 初回同期（ログイン時）
1. `useAuth()` でログイン/登録成功
2. `performInitialSync(userId)` を実行
3. サーバーから全データ取得 → Dexieに`_syncStatus: "synced"`で保存

### 自動同期（バックグラウンド）
1. `useSyncEngine()` が `syncEngine.startAutoSync()` を起動
2. 定期的に `_syncStatus: "pending"` のレコードをサーバーに送信
3. 成功 → `"synced"`、失敗 → `"failed"`

### 認証フロー
1. 起動時: Dexieの`authState`テーブルで`lastLoginAt`を確認
2. 1時間以内 → オフライン認証OK、UIを即座に表示、バックグラウンドでリフレッシュ
3. 期限切れ/未存在 → サーバーに認証リクエスト

## API通信

```typescript
// src/utils/apiClient.ts
const apiClient = hc<AppType>(API_URL, {
  fetch: customFetch, // @packages/sync-engineのcreateAuthenticatedFetch()で認証トークン自動付与
});
```

- Honoクライアント（`hc`）で型安全なエンドポイント呼び出し
- 開発環境API URL: `http://localhost:3456`

## UI規約

- `confirm()` / `alert()` 禁止 → インライン2段階確認UI
- モーダル: `ModalOverlay` 共通コンポーネント
- 閉じるボタン: Lucide `X` アイコン
- アイコン: Lucide React
- snake_case→camelCase変換: `apiMappers.ts`の型付きマッパー（`as`キャスト禁止）

## テスト

### テストフレームワーク
- **Vitest**: テストランナー
- テストファイルは対象ファイルと同ディレクトリに配置（例: `activityRepository.test.ts`）

### テスト対象
- Dexieリポジトリ（`src/db/*.test.ts`）
- カスタムフック（`src/hooks/*.test.ts`）
- 同期ロジック（`src/sync/*.test.ts`）

### テスト実行
```bash
pnpm run test-once   # CIモード
```

## 開発サーバー
- ポート: **2460**
- ブラウザ確認はClaude in Chrome MCPを使用
- モバイルファースト: 375px幅でのレイアウト確認を推奨

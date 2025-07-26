# フロントエンドの構造について

## 技術スタック

### コアライブラリ
- **React 19**: UIライブラリ
- **TypeScript**: 型安全な開発
- **Vite**: 高速なビルドツール

### ルーティング・状態管理
- **Tanstack Router**: ファイルベースのルーティング
- **Tanstack Query**: サーバー状態管理
- **React Context**: ローカル状態管理（認証、グローバル日付など）

### UI・スタイリング
- **Tailwind CSS**: ユーティリティファーストCSS
- **Radix UI**: アクセシブルなUIコンポーネント
- **shadcn/ui**: Radix UIベースのコンポーネントライブラリ
- **Lucide React**: アイコンライブラリ

### 開発ツール
- **Biome**: リンター・フォーマッター
- **Vitest**: テストフレームワーク
- **React Hook Form**: フォーム管理
- **Zod**: スキーマバリデーション

## アーキテクチャ方針

### コンポーネントとフックの責務分離

本プロジェクトでは、**コンポーネントは純粋なプレゼンテーション層**として実装し、**すべてのロジックをカスタムフックに集約**する設計を採用しています。

#### 設計原則

1. **コンポーネントの責務**
   - UIの表示のみを担当
   - フックから受け取ったデータとハンドラーを使用
   - ビジネスロジック、状態管理、API通信は行わない
   - テストは基本的に不要（フックのテストでカバー）

2. **カスタムフックの責務**
   - すべての状態管理
   - API通信とデータフェッチ
   - ビジネスロジックの実装
   - イベントハンドラーの実装
   - フォーム管理とバリデーション
   - ユニットテストの実施

#### 実装例

**コンポーネントの例（DailyPage.tsx）**
```typescript
export const ActivityDailyPage: React.FC = () => {
  // フックからすべてのロジックを取得
  const {
    date,
    setDate,
    editDialogOpen,
    editTargetLog,
    createDialogOpen,
    setCreateDialogOpen,
    isLoading,
    tasks,
    isTasksLoading,
    mergedActivityLogs,
    isOfflineData,
    handleActivityLogClick,
    handleActivityLogEditDialogChange,
  } = useDailyPage();

  // UIの表示のみを担当
  return (
    <>
      <ActivityDateHeader date={date} setDate={setDate} />
      {/* UIの定義... */}
    </>
  );
};
```

**カスタムフックの例（useDailyPage.ts）**
```typescript
export const useDailyPage = () => {
  // 状態管理
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editTargetLog, setEditTargetLog] = useState<GetActivityLogResponse | null>(null);
  
  // API通信
  const { data: activityLogs, isLoading } = useQuery({
    queryKey: ["activity-logs-daily", date],
    queryFn: () => apiClient.users["activity-logs"].$get({ query: { date } }),
  });
  
  // 同期処理のロジック
  const { mergedActivityLogs, isOfflineData } = useActivityLogSync({
    date,
    isOnline,
    activityLogs,
  });
  
  // イベントハンドラー
  const handleActivityLogClick = (log: GetActivityLogResponse) => {
    setEditTargetLog(log);
    setEditDialogOpen(true);
  };
  
  // コンポーネントに公開するインターフェース
  return {
    // State
    date,
    setDate,
    editDialogOpen,
    // Data
    mergedActivityLogs,
    isLoading,
    // Handlers
    handleActivityLogClick,
    // その他必要なもの...
  };
};
```

#### テスト戦略

- **コンポーネント**: 基本的にテストを書かない（シンプルなUIのため）
- **カスタムフック**: すべてのロジックに対してユニットテストを書く
- **テストカバレッジ**: フックのテストでビジネスロジックを100%カバー

#### メリット

1. **テスタビリティの向上**
   - ビジネスロジックがフックに集約されているため、テストが書きやすい
   - UIとロジックが分離されているため、モックが容易

2. **再利用性**
   - カスタムフックは複数のコンポーネントで共有可能
   - ロジックの変更がコンポーネントに影響しない

3. **保守性**
   - コンポーネントはシンプルで読みやすい
   - ロジックの変更がフック内に閉じ込められる

4. **パフォーマンス**
   - コンポーネントの再レンダリングが最小限に抑えられる
   - ロジックの最適化がフック内で完結

#### フックの命名規則

- **機能別フック**: `use{Feature}Page` (例: `useDailyPage`, `useTasksPage`)
- **アクションフック**: `use{Action}` (例: `useLogin`, `useCreateUser`)
- **データフック**: `use{Entity}` (例: `useActivities`, `useTasks`)
- **同期関連フック**: `useSynced{Entity}` (例: `useSyncedActivityLog`)

## ディレクトリ構造

```txt
apps/frontend/src/
├── components/          # UIコンポーネント
│   ├── activity/       # 活動記録関連
│   ├── apiKey/       # APIキー管理関連
│   ├── daily/        # 日次記録関連
│   ├── goal/          # 目標設定関連
│   ├── root/          # ルートレベルコンポーネント
│   ├── sync/          # 同期関連
│   ├── tasks/         # タスク管理関連
│   └── ui/            # 共通UIコンポーネント（shadcn/ui）
├── hooks/             # カスタムフック（ビジネスロジックを集約）
│   ├── api/          # API通信関連フック
│   ├── feature/      # 機能別フック
│   └── sync/         # 同期関連フック
├── providers/         # コンテキストプロバイダー
├── routes/            # ルーティング定義（Tanstack Router）
├── types/             # 型定義
├── utils/             # ユーティリティ関数
├── main.tsx          # エントリーポイント
└── routeTree.gen.ts  # 自動生成されたルート定義
```

## 主要コンポーネント

### 1. 認証・レイアウト

#### AuthProvider (`providers/AuthProvider.tsx`)
- 認証状態の管理
- アクセストークンのメモリ管理
- リフレッシュトークンによる自動更新（14分毎）
- 初回起動時の認証状態確認

#### AuthenticatedLayout (`components/root/AuthenticatedLayout.tsx`)
- 認証後の共通レイアウト
- ヘッダー、ナビゲーション、フッター

### 2. 活動記録機能 (`components/activity/`)

#### ActivityList
- 活動一覧の表示
- ドラッグ&ドロップによる並び替え
- 削除・編集機能

#### ActivityLogCreateForm
- 活動記録の入力フォーム
- 数量・メモ・時刻の入力
- バリデーション機能

#### ActivityStats
- 活動の統計情報表示
- 日次・週次・月次の集計

### 3. タスク管理機能 (`components/task/`)

#### TaskList
- タスク一覧表示
- 完了/未完了の切り替え
- フィルタリング機能

#### TaskForm
- タスク作成・編集フォーム
- 期限設定機能

### 4. 目標設定機能 (`components/goal/`)

#### GoalSettingPage
- 月次目標の設定
- 活動ごとの目標値管理

### 5. APIキー管理機能 (`components/apiKey/`)

#### ApiKeyManager
- APIキーの一覧表示
- 新規APIキーの生成
- APIキーの削除・管理

#### CreateApiKeyDialog
- APIキー作成ダイアログ
- キー名の入力
- 生成後のキー表示

### 6. 同期機能 (`components/sync/`)

#### OfflineBanner
- オフライン状態の表示
- 同期待ちデータの表示

#### SyncStatusIndicator
- 同期状態の表示
- 同期エラーの表示

#### SyncProgressBar
- 同期進捗の表示

## ルーティング構造

Tanstack Routerによるファイルベースルーティング：

```txt
routes/
├── __root.tsx                    # ルートレイアウト（RootPageコンポーネント）
├── index.tsx                     # インデックスページ（設定に応じてリダイレクト）
├── actiko.tsx                    # 活動記録画面（メイン機能）
├── daily.tsx                     # 日次記録画面
├── tasks.tsx                     # タスク一覧画面
├── new-goal.tsx                  # 目標設定画面
├── setting.tsx                   # 設定画面
└── activity/
    └── stats.tsx                 # 活動統計画面
```

### ルーティングの特徴

1. **ルートレイアウト（`__root.tsx`）**
   - `RootPage`コンポーネントが認証状態を管理
   - 未ログイン: ログイン/新規登録フォームを表示
   - ログイン済み: `AuthenticatedLayout`を表示

2. **認証後のレイアウト（`AuthenticatedLayout`）**
   - メインコンテンツエリア（`<Outlet />`）
   - 下部ナビゲーションバー
   - 右上ハンバーガーメニュー（設定・ログアウト）
   - オフラインバナーと同期状態表示

3. **ナビゲーション構造**
   ```
   Actiko | Daily | Stats | Goal | Tasks
   ```
   - 各タブはTanstack Routerの`<Link>`で実装
   - アクティブ状態は`.active`クラスでスタイリング

4. **インデックスページのリダイレクト**
   ```typescript
   const { settings } = useAppSettings();
   const redirectTo = settings.showGoalOnStartup ? "/new-goal" : "/actiko";
   ```
   - 設定に基づいて初期画面を決定

5. **フラットなルート構造**
   - ネストされたルートグループは使用せず
   - すべてのページがルート直下に配置
   - 認証制御は`RootPage`内で実施

## カスタムフック

### useAuth
- 認証状態の取得
- ログイン・ログアウト機能
- トークン管理

### useGlobalDate
- グローバルな日付状態管理
- 日付ナビゲーション機能

### useApiClient
- API通信のラッパー
- エラーハンドリング
- 401エラー時のイベント発火

### useActivities / useActivityLogs / useTasks
- 各エンティティのCRUD操作
- Tanstack Queryを使用したキャッシュ管理
- 楽観的更新

### useApiKeys
- APIキーの取得・作成・削除
- APIキー一覧の管理

### useSubscription
- サブスクリプション情報の取得
- プランの状態管理

### 同期関連フック
- **useSyncStatus**: 同期状態の監視
- **useSyncedMutation**: オフライン対応のミューテーション
- **useOfflineBanner**: オフライン状態の表示制御

## 状態管理戦略

### サーバー状態（Tanstack Query）
- APIから取得するデータ
- キャッシュ管理
- バックグラウンド再取得

### ローカル状態（React Context）
- 認証情報（AuthContext）
- グローバル日付（DateContext）
- UI状態（モーダル開閉など）

### フォーム状態（React Hook Form）
- 入力値の管理
- バリデーション
- エラー表示

## API通信

### apiClient (`utils/apiClient.ts`)
- fetchのラッパー
- 認証ヘッダーの自動付与
- エラーハンドリング
- 型安全なレスポンス

### エンドポイント定義
- 環境変数`VITE_API_URL`でベースURL設定
- 開発環境: `http://localhost:3456`
- 本番環境: Cloudflare Workers URL

## パフォーマンス最適化

### コード分割
- ルートレベルでの自動分割
- 遅延読み込み（React.lazy）

### キャッシュ戦略
- Tanstack Queryによるキャッシュ
- staleTime: 5分
- gcTime: 10分

### 最適化テクニック
- React.memo による再レンダリング防止
- useMemo / useCallback の活用
- 仮想スクロール（大量データ表示時）

## テスト戦略

### テストフレームワーク
- **Vitest**: 高速なテストランナー（Viteベース）
- **React Testing Library**: DOM テスティング
- **@testing-library/jest-dom**: DOM アサーション拡張
- **@testing-library/user-event**: ユーザーインタラクションのシミュレーション

### テスト設定（`vitest.config.ts`）
```typescript
{
  globals: true,
  environment: 'jsdom',
  setupFiles: ['./test.setup.ts'],
  testTimeout: 20000,
  hookTimeout: 20000,
  coverage: {
    provider: 'v8',
    reporter: ['text', 'json', 'html'],
    exclude: [
      'node_modules/', 'dist/', '**/*.d.ts',
      '**/*.config.*', '**/*.gen.ts', '**/mockData.ts',
      '**/test-utils/**'
    ]
  }
}
```

### テストユーティリティ（`src/test-utils/`）

#### 1. テストセットアップ
- **test.setup.ts**: グローバルモックとReact 19対応設定
  - localStorage/sessionStorageのモック
  - navigator.onLineのモック
  - matchMediaのモック
  - React 19のact警告抑制

#### 2. カスタムレンダラー
- **renderWithProviders**: プロバイダーラップ用カスタムレンダラー
- **renderWithAct**: React 19対応のact自動ラップ
- **waitForWithAct**: 非同期処理の待機ヘルパー

#### 3. モックプロバイダー
- **MockAuthProvider**: 認証コンテキストのモック
- **MockTokenProvider**: トークン管理のモック
- **MockNetworkStatusProvider**: ネットワーク状態のモック
- **MockSyncManager**: 同期処理のモック

#### 4. モックヘルパー関数
```typescript
// APIクライアントモック
createMockApiClient()

// イベントバスモック
createMockEventBus()

// ストレージモック（Proxy使用）
createMockStorage()

// タイムプロバイダーモック
createMockTimeProvider(initialTime)
```

#### 5. テストデータファクトリー（`testData.ts`）
```typescript
// UUID v4形式のテストID使用
createMockUser(overrides?)
createMockActivity(overrides?)
createMockActivityLog(overrides?)
createMockGoal(overrides?)
createMockTask(overrides?)
createMockActivityLogResponse(overrides?)
```

### テストパターン

#### 1. カスタムフックのテスト
```typescript
// フックのモック設定
vi.mock('@frontend/hooks/useAuth')
vi.mock('@tanstack/react-router')

// テスト例
describe('useLogin', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // モックの設定
  })
  
  it('should handle login success', async () => {
    const { result } = renderHook(() => useLogin())
    await act(async () => {
      await result.current.login({ login_id: 'test', password: 'pass' })
    })
    expect(mockNavigate).toHaveBeenCalledWith({ to: '/today' })
  })
})
```

#### 2. コンポーネントのテスト
```typescript
const renderWithContext = (ui: ReactElement) => {
  return renderWithProviders(ui, {
    providers: (
      <MockTokenProvider>
        <MockAuthProvider>
          {/* 他のプロバイダー */}
        </MockAuthProvider>
      </MockTokenProvider>
    )
  })
}
```

#### 3. 非同期処理のテスト
```typescript
// waitForWithActを使用
await waitForWithAct(async () => {
  expect(screen.getByText('Loading')).toBeInTheDocument()
})

// renderHookWithActSyncを使用
const { result, waitForNextUpdate } = renderHookWithActSync(
  () => useAsyncHook()
)
```

### テストの構造
```
src/
├── components/
│   └── {feature}/
│       └── __tests__/
├── hooks/
│   ├── api/
│   │   └── {feature}/
│   │       └── test/
│   ├── feature/
│   │   └── {feature}/
│   │       └── test/
│   └── sync/
│       └── test/
└── test-utils/
    ├── Mock*.tsx
    ├── render*.tsx
    ├── testData.ts
    └── index.tsx
```

### テスト実行コマンド
```bash
# 単体テスト実行（CIモード）
npm run test-once

# カバレッジレポート生成
npm run test-once -- --coverage

# 特定のファイルのみテスト
npm run test-once -- useLogin.test.tsx
```

### ベストプラクティス

1. **テストIDの一貫性**: UUID v4形式（`00000000-0000-4000-8000-00000000000x`）
2. **モックの初期化**: `beforeEach`で`vi.clearAllMocks()`を実行
3. **非同期処理**: React 19対応の`act`ラッパーを使用
4. **テストデータ**: ファクトリー関数で一貫性のあるデータ生成
5. **カバレッジ**: 重要なビジネスロジックとカスタムフックを優先

### ユニットテスト
- Vitestによるコンポーネントテスト
- カスタムフックのテスト
- ユーティリティ関数のテスト

### 統合テスト
- React Testing Libraryを使用
- ユーザー操作のシミュレーション
- APIモックによるE2Eテスト

## セキュリティ考慮事項

### XSS対策
- React による自動エスケープ
- dangerouslySetInnerHTMLの使用禁止

### 認証トークン管理
- アクセストークン: メモリ内管理
- リフレッシュトークン: httpOnlyクッキー
- CSRF対策: SameSite=Strict

### 環境変数
- APIエンドポイントなどは環境変数で管理
- 機密情報はフロントエンドに含めない

## デプロイメント

### ビルド
```bash
npm run build-client     # 本番ビルド
npm run build-client-stg # ステージングビルド
```

### ホスティング
- Cloudflare Pages
- 自動デプロイ（GitHub連携）
- プレビューデプロイ機能

## 今後の計画

### PWA対応
- Service Worker実装
- オフライン対応
- プッシュ通知

### 国際化（i18n）
- 多言語対応
- 日付・数値フォーマット

### アクセシビリティ向上
- WAI-ARIA対応強化
- キーボードナビゲーション改善
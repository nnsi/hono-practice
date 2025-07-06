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

## ディレクトリ構造

```txt
apps/frontend/src/
├── components/          # UIコンポーネント
│   ├── activity/       # 活動記録関連
│   ├── goal/          # 目標設定関連
│   ├── root/          # ルートレベルコンポーネント
│   ├── task/          # タスク管理関連
│   └── ui/            # 共通UIコンポーネント（shadcn/ui）
├── hooks/             # カスタムフック
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

## ルーティング構造

Tanstack Routerによるファイルベースルーティング：

```txt
routes/
├── __root.tsx                    # ルートレイアウト
├── (authenticated)/              # 認証必須ルート
│   ├── (index).tsx              # ホーム（リダイレクト）
│   ├── activity/
│   │   ├── $id.tsx              # 活動詳細
│   │   └── new.tsx              # 新規活動作成
│   ├── goals/
│   │   └── $year.$month.tsx    # 月次目標設定
│   ├── settings.tsx             # 設定画面
│   ├── tasks.tsx                # タスク一覧
│   └── today.tsx                # 今日の活動記録
├── login.tsx                     # ログイン画面
└── new.tsx                       # ユーザー登録画面
```

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
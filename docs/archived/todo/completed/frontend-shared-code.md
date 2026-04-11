# Frontend Shared Code Migration Todo List

このドキュメントは、apps/frontend から packages/frontend-shared への移行状況を追跡するためのチェックリストです。

## ✅ 完了済みタスク

### APIフック（基本）
- [x] `useAuth` - 認証関連
- [x] `useActivityBatchData` - アクティビティバッチデータ取得

### 汎用フック
- [x] `useGlobalDate` - グローバル日付管理
- [x] `useTimer` - タイマー機能
- [x] `useNetworkStatus` - ネットワーク状態管理

### Featureフック
- [x] `useActivityStats` - アクティビティ統計
- [x] `useActivityCalendar` - アクティビティカレンダー
- [x] `useTaskGroup` - タスクグループ管理
- [x] `useActivityLogEdit` - アクティビティログ編集

## 📋 タスク一覧

### 1. APIフック（追加分）

#### Goals関連
- [x] `useGoals` - Goal一覧取得
- [x] `useGoal` - 個別Goal取得
- [x] `useCreateGoal` - Goal作成
- [x] `useUpdateGoal` - Goal更新
- [x] `useDeleteGoal` - Goal削除
- [x] `useGoalStats` - Goal統計

#### Tasks関連
- [x] `useTasks` - タスク一覧取得
- [x] `useArchivedTasks` - アーカイブ済みタスク取得
- [x] `useTask` - 個別タスク取得
- [x] `useCreateTask` - タスク作成
- [x] `useUpdateTask` - タスク更新
- [x] `useDeleteTask` - タスク削除
- [x] `useArchiveTask` - タスクアーカイブ

#### Activities関連
- [x] `useActivities` - アクティビティ一覧取得
- [x] `useCreateActivity` - アクティビティ作成
- [x] `useUpdateActivity` - アクティビティ更新
- [x] `useDeleteActivity` - アクティビティ削除
- [x] `useUploadActivityIcon` - アクティビティアイコンアップロード（Web固有のため部分的に移行）
- [x] `useDeleteActivityIcon` - アクティビティアイコン削除（Web固有のため部分的に移行）

#### ActivityLogs関連
- [x] `useActivityLogs` - アクティビティログ一覧取得
- [x] `useCreateActivityLog` - アクティビティログ作成
- [x] `useUpdateActivityLog` - アクティビティログ更新
- [x] `useDeleteActivityLog` - アクティビティログ削除
- [x] `useActivityStatsApi` - アクティビティ統計API
- [x] `useBatchImportActivityLogs` - アクティビティログ一括インポート

#### その他のAPI
- [x] `useApiKeys` - APIキー一覧取得
- [x] `useCreateApiKey` - APIキー作成
- [x] `useDeleteApiKey` - APIキー削除
- [x] `useSubscription` - サブスクリプション管理

### 2. Web固有機能（別実装が必要）

#### CSV関連
- [ ] `useCSVParser` - CSVパース機能
- [ ] `useActivityLogValidator` - アクティビティログ検証
- [ ] `useActivityLogImport` - CSVインポート機能

### 3. ページレベルのフック（部分的に共通化可能）

#### 認証・ユーザー関連
- [x] `useLogin` - ログインページロジック
- [x] `useCreateUser` - ユーザー作成ロジック
- [x] `useAuthInitializer` - 認証初期化ロジック

#### Goal関連
- [x] `useNewGoalPage` - 新規Goal作成ページ
- [x] `useNewGoalCard` - 新規Goalカード
- [x] `useNewGoalDialog` - 新規Goalダイアログ
- [x] `useNewGoalSlot` - 新規Goalスロット
- [x] `useGoalDetailModal` - Goal詳細モーダル

#### Task関連
- [x] `useTasksPage` - タスク一覧ページ
- [x] `useTaskEditForm` - タスク編集フォーム（移行済み）
- [x] `useTaskActions` - タスクアクション（移行済み）
- [x] `useDailyTaskActions` - デイリータスクアクション（移行済み）

#### Activity関連
- [x] `useActivityRegistPage` - アクティビティ登録ページ
- [x] `useActivityEdit` - アクティビティ編集
- [ ] `useActivityLogCreate` - アクティビティログ作成（タイマー機能がプラットフォーム固有のため保留）
- [x] `useDailyActivityCreate` - デイリーアクティビティ作成（移行済み）

#### その他
- [x] `useDailyPage` - デイリーページ
- [x] `useAppSettings` - アプリ設定
- [x] `useUserSettings` - ユーザー設定

## 移行方針

### 優先度: 高
APIフック（セクション1）は全て共通化可能なため、優先的に移行する

### 優先度: 中
ページレベルのフック（セクション3）からビジネスロジックを抽出して共通化

### 優先度: 低
Web固有機能（セクション2）はReact Native側で別実装を検討

## 注意事項

- EventBusインターフェースの差異はEventBusAdapterで解決済み
- NotificationはNotificationAdapterで抽象化済み
- ルーティング関連のロジックは各プラットフォームで個別実装が必要

## 移行完了（2025-08-05）

### 追加フック移行完了（2025-08-05）
- Goal関連の残りのフックを移行完了
  - `useNewGoalCard`
  - `useNewGoalDialog` 
  - `useNewGoalSlot`
  - `useGoalDetailModal`
- 認証関連フックを移行完了
  - `useCreateUser`
  - `useAuthInitializer`
- `useAppSettings`の移行完了（WebとMobileで共通設定項目のため）

### 技術的な変更点
- `createUseActivities`をファクトリパターンに変更（他のフックと統一）
- Goal/Task関連のAPIフックは直接結果を返す形式を維持
- プラットフォーム固有の機能（ピンチズーム無効化など）は`platformInitializer`で対応

## 移行完了（2025-08-05）

### APIフックの移行
- すべてのAPIフックの移行を完了
- `useActivityStatsApi`と`useBatchImportActivityLogs`をfrontend-sharedに追加
- Web固有の実装（画像リサイズ等）は部分的に移行

### ページレベルフックの移行
- 主要なページレベルフックの移行を完了
  - `useLogin`, `useNewGoalPage`, `useTasksPage`, `useActivityRegistPage`, `useActivityEdit`, `useDailyPage`, `useUserSettings`
- 細かいコンポーネントレベルのフックは未移行（優先度が低いため）

### テスト結果
- Unit tests: すべて成功（817パス、4スキップ/821）
- E2E tests: すべて成功
- TypeScriptコンパイル: エラーなし
- アプリケーションの動作に問題なし

### 修正したテスト（2025-08-05）
- `useNewGoalPage`テスト: 日本語のデフォルト値に合わせて期待値を修正
- `useActivityStats`テスト: APIモックに`ok: true`プロパティを追加
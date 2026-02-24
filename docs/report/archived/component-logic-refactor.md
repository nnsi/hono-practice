# コンポーネントロジック分離要調査リスト

> 目的: hooks にロジックを集約し、コンポーネントを薄く保つため、既存コンポーネントに残存するビジネスロジックを洗い出す。

## 判定基準

- `useState` / `useEffect` などで **データ取得・副作用** を直接行っている
- React Query `mutate`・キャッシュ無効化・同期キュー操作を **コンポーネント内で実装**
- **UI 以外の状態管理** (タイマー、長押し判定、オフラインシミュレーション等)
- **フォーム state 管理** や入力検証が分散している

---

## 要改善コンポーネント一覧

| コンポーネント (パス) | 主なロジック内容 | 抽出候補 Hook | 優先度 |
| --- | --- | --- | --- |
| `root/LoginForm.tsx` | 認証 API 呼び出し、トークン保存、フォーム state | `useLogin` | ★★★ |
| `root/RootPage.tsx` | 初期化時のユーザ取得・トークンリフレッシュ | `useAuthInitializer` | ★★★ |
| `root/CreateUserForm.tsx` | ユーザ作成 API 呼び出し、バリデーション | `useCreateUser` | ★★☆ |
| `setting/SettingPage.tsx` | logout 処理、ユーザ情報表示 | `useUserSettings` | ★★☆ |
| `sync/OfflineBanner.tsx` | ネットワーク状態監視、タイマー自動クローズ | `useOfflineBanner` | ★★☆ |
| `sync/NetworkDebugToggle.tsx` | オフラインモードの模擬切替 (localStorage) | `useNetworkDebug` | ★☆☆ |
| `sync/SyncStatusIndicator.tsx` | 同期キュー進捗の購読・表示 | `useSyncStatusIndicator` | ★★☆ |
| `tasks/TasksPage.tsx` | 完了タスクのフィルタ切替、日付選択 | `useTasksPage` | ★★☆ |
| `tasks/TaskList.tsx` | タスク CRUD, React Query mutate, ダイアログ制御 | `useTaskActions` | ★★★ |
| `tasks/TaskGroup.tsx` | タスクグループごとの CRUD / ダイアログ管理 | `useTaskGroup` | ★★☆ |
| `tasks/TaskEditDialog.tsx` | フォーム state・更新 API | `useTaskEditForm` | ★★☆ |
| `daily/DailyPage.tsx` | 日付選択、ダイアログ状態、データ取得 | `useDailyPage` | ★★☆ |
| `daily/DailyActivityLogCreateDialog.tsx` | 活動記録作成ロジック、タブ切替 | `useDailyActivityCreate` | ★★☆ |
| `daily/ActivityLogEditDialog.tsx` | 活動記録編集ロジック、バリデーション | `useActivityLogEdit` | ★★☆ |
| `daily/TaskList.tsx` | 日別タスク CRUD、ダイアログ状態 | `useDailyTaskActions` | ★★☆ |
| `apiKey/CreateApiKeyDialog.tsx` | APIキー生成・コピー・トースト制御 | `useApiKey` | ★☆☆ |
| `activity/ActivityRegistPage.tsx` | 1日分の活動データ取得、モーダル/長押し判定、キャッシュ操作 | `useActivityRegistPage` | ★★★ |
| `activity/ActivityDateHeader.tsx` | カレンダー開閉・月移動 | `useActivityCalendar` | ★★☆ |
| `activity/ActivityLogCreateDialog.tsx` | 活動ログ作成、タブ切替、日付計算 | `useActivityLogCreate` | ★★☆ |
| `activity/ActivityEditDialog.tsx` | 活動内容編集、バリデーション | `useActivityEdit` | ★★☆ |
| `activity/stats/StatsPage.tsx` | 月次統計計算、グラフデータ生成 | `useActivityStats` | ★★☆ |
| `goal/NewGoalPage.tsx` | 目標作成ダイアログ管理、入力検証 | `useNewGoalPage` | ★★☆ |
| `goal/NewGoalCard.tsx` | 目標詳細モーダル・アニメーション制御 | `useGoalCard` | ★☆☆ |
| `goal/NewGoalSlot.tsx` | スロット状態管理、作成フロー制御 | `useGoalSlot` | ★☆☆ |

★ = 重要度 / 手戻りリスクの大小 (★3 が最優先)

> 備考: 上記は `useState`/`useEffect` や React Query の `mutate` を直接呼んでいるファイルを中心に機械的に抽出しています。実際の改修時には UI 固有ローカル state (モーダル open state 等) を残すかどうか、粒度を要検討。

---

## リファクタリング実施記録

### 2025-07-20 実施内容

以下の優先度★★★のコンポーネントのロジックを抽出しました：

#### 1. LoginForm.tsx → useLogin hook
- **作成ファイル**: `/apps/frontend/hooks/feature/login/useLogin.ts`
- **抽出内容**:
  - フォーム状態管理（react-hook-form）
  - 通常のログイン処理（handleLogin）
  - Google認証成功時の処理（handleGoogleSuccess）
  - Google認証エラー時の処理（handleGoogleError）
  - トースト表示ロジック
  - ナビゲーションロジック

#### 2. RootPage.tsx → useAuthInitializer hook
- **作成ファイル**: `/apps/frontend/hooks/feature/auth/useAuthInitializer.ts`
- **抽出内容**:
  - APIエラーハンドリング（handleApiError）
  - 未認証時の処理（handleUnauthorized）
  - ピンチズーム無効化処理（handleDisablePinchZoom）
  - イベントリスナーの登録と解除
  - 初期化状態とユーザー状態の管理

#### 3. TaskList.tsx → useTaskActions hook
- **作成ファイル**: `/apps/frontend/hooks/feature/tasks/useTaskActions.ts`
- **抽出内容**:
  - ダイアログ状態管理（createDialogOpen, editDialogOpen, selectedTask）
  - タスクの完了/未完了切り替え処理（handleToggleTaskDone）
  - タスクの削除処理（handleDeleteTask）
  - タスクのアーカイブ処理（handleArchiveTask）
  - タスク編集開始処理（handleStartEdit）
  - ダイアログクローズ処理（handleEditDialogClose）
  - 日付フォーマット処理（formatDate）
  - mutation状態の提供

#### 4. ActivityRegistPage.tsx → useActivityRegistPage hook
- **作成ファイル**: `/apps/frontend/hooks/feature/activity/useActivityRegistPage.ts`
- **抽出内容**:
  - 状態管理（open, selectedActivity, editModalOpen, editTargetActivity）
  - データ取得（useActivityBatchData）
  - キャッシュ無効化ヘルパー関数（invalidateActivityCache）
  - アクティビティクリック処理（handleActivityClick）
  - 新規アクティビティ処理（handleNewActivityClick）
  - 編集処理（handleEditClick）
  - 各種ダイアログの開閉処理
  - キャッシュ更新処理

### 効果
- コンポーネントがUIの表示に専念できるようになった
- ビジネスロジックがテスト可能な形で分離された
- 関心の分離により、保守性が向上した
- React Queryのキャッシュ操作が一元化された

---

### 2025-07-20 追加実施内容（★★☆優先度）

以下の16個のコンポーネントのロジックを抽出しました：

#### 5. CreateUserForm.tsx → useCreateUser hook
- **作成ファイル**: `/apps/frontend/src/hooks/feature/root/useCreateUser.ts`
- **抽出内容**:
  - フォーム状態管理（react-hook-form）
  - ユーザー作成API呼び出し処理
  - Google認証によるユーザー作成処理
  - エラーハンドリングとトースト表示

#### 6. SettingPage.tsx → useUserSettings hook
- **作成ファイル**: `/apps/frontend/src/hooks/feature/setting/useUserSettings.ts`
- **抽出内容**:
  - ログアウト処理
  - Googleアカウント連携状態の管理
  - Google認証との連携/解除処理
  - キャッシュクリアとナビゲーション

#### 7. OfflineBanner.tsx → useOfflineBanner hook
- **作成ファイル**: `/apps/frontend/src/hooks/sync/useOfflineBanner.ts`
- **抽出内容**:
  - バナー表示状態の管理
  - 自動非表示タイマー（5秒）
  - 手動での非表示処理
  - オンライン/オフライン状態の監視

#### 8. SyncStatusIndicator.tsx → useSyncStatusIndicator hook
- **作成ファイル**: `/apps/frontend/src/hooks/sync/useSyncStatusIndicator.ts`
- **抽出内容**:
  - 同期ステータスの監視
  - アイコンとテキストの動的生成
  - 手動同期の実行処理
  - トースト通知の管理

#### 9. TasksPage.tsx → useTasksPage hook
- **作成ファイル**: `/apps/frontend/src/hooks/feature/tasks/useTasksPage.ts`
- **抽出内容**:
  - タスクとアーカイブタスクの取得
  - フィルター状態の管理
  - タスクのグループ化ロジック（日付別）
  - クエリキャッシュの管理

#### 10. TaskGroup.tsx → useTaskGroup hook
- **作成ファイル**: `/apps/frontend/src/hooks/feature/tasks/useTaskGroup.ts`
- **抽出内容**:
  - タスク編集ダイアログの状態管理
  - タスクの完了/未完了切り替え
  - 今日への移動処理
  - アーカイブ処理

#### 11. TaskEditDialog.tsx → useTaskEditForm hook
- **作成ファイル**: `/apps/frontend/src/hooks/feature/tasks/useTaskEditForm.ts`
- **抽出内容**:
  - タスク編集フォームの管理
  - 更新処理とバリデーション
  - 削除確認ダイアログの管理
  - 日付フォーマット処理

#### 12. DailyPage.tsx → useDailyPage hook
- **作成ファイル**: `/apps/frontend/src/hooks/feature/daily/useDailyPage.ts`
- **抽出内容**:
  - 日付選択とナビゲーション
  - アクティビティログとタスクの統合表示
  - 編集/作成ダイアログの状態管理
  - オフラインデータのマージ処理

#### 13. DailyActivityLogCreateDialog.tsx → useDailyActivityCreate hook
- **作成ファイル**: `/apps/frontend/src/hooks/feature/daily/useDailyActivityCreate.ts`
- **抽出内容**:
  - アクティビティ選択の管理
  - ダイアログ遷移の制御
  - 作成成功時の処理

#### 14. ActivityLogEditDialog.tsx → useActivityLogEdit hook
- **作成ファイル**: `/apps/frontend/src/hooks/feature/daily/useActivityLogEdit.ts`
- **抽出内容**:
  - 編集フォームの状態管理
  - 数量、種類、メモの更新処理
  - 削除処理
  - 入力値の検証とフォーマット

#### 15. daily/TaskList.tsx → useDailyTaskActions hook
- **作成ファイル**: `/apps/frontend/src/hooks/feature/daily/useDailyTaskActions.ts`
- **抽出内容**:
  - タスク作成ダイアログの管理
  - タスクの完了/未完了切り替え
  - タスクの削除処理

#### 16. ActivityDateHeader.tsx → useActivityCalendar hook
- **作成ファイル**: `/apps/frontend/src/hooks/feature/activity/useActivityCalendar.ts`
- **抽出内容**:
  - カレンダーの開閉状態管理
  - 日付ナビゲーション（前日/翌日/今日）
  - 月の切り替え処理
  - カレンダーからの日付選択

#### 17. ActivityLogCreateDialog.tsx → useActivityLogCreate hook
- **作成ファイル**: `/apps/frontend/src/hooks/feature/activity/useActivityLogCreate.ts`
- **抽出内容**:
  - 手動入力とタイマーモードの切り替え
  - タイマー機能の統合（useTimer）
  - フォーム状態管理
  - 作成処理とキャッシュ更新

#### 18. ActivityEditDialog.tsx → useActivityEdit hook
- **作成ファイル**: `/apps/frontend/src/hooks/feature/activity/useActivityEdit.ts`
- **抽出内容**:
  - アクティビティ編集フォームの管理
  - 種類（kinds）の追加/削除
  - 更新/削除処理
  - キャッシュの無効化

#### 19. stats/StatsPage.tsx → useActivityStats hook
- **作成ファイル**: `/apps/frontend/src/hooks/feature/activity/useActivityStats.ts`
- **抽出内容**:
  - 月次統計データの取得
  - 月のナビゲーション
  - 目標ラインの計算
  - グラフ用データの生成

#### 20. NewGoalPage.tsx → useNewGoalPage hook
- **作成ファイル**: `/apps/frontend/src/hooks/feature/goal/useNewGoalPage.ts`
- **抽出内容**:
  - 現在/過去の目標の分類
  - 編集ダイアログの状態管理
  - アクティビティ情報の取得ヘルパー
  - 作成/編集後の処理

### 総括
- 合計20個のコンポーネント（★★★優先度4個 + ★★☆優先度16個）のリファクタリングを完了
- すべてのビジネスロジックを適切なカスタムフックに分離
- コンポーネントは純粋なプレゼンテーション層として機能
- 型チェックとリンティングをパスし、コード品質を維持 
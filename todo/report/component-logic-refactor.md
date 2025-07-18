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
| `ui/emoji-picker.tsx` | 検索フィルタ・カテゴリ切替・スクロール | `useEmojiPicker` | ★☆☆ |

★ = 重要度 / 手戻りリスクの大小 (★3 が最優先)

> 備考: 上記は `useState`/`useEffect` や React Query の `mutate` を直接呼んでいるファイルを中心に機械的に抽出しています。実際の改修時には UI 固有ローカル state (モーダル open state 等) を残すかどうか、粒度を要検討。 
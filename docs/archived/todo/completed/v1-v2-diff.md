# frontend (v1) → frontend-v2 機能差分レポート

v1にあってv2にない機能を網羅的に調査した結果。

---

## 1. 完全に未移植の機能

### 1-1. Toast通知システム
- **v1**: shadcn/ui の `Toaster` + `useToast` でアプリ全体にトースト通知を表示
  - アクティビティ作成成功/失敗、ログアウト失敗、各種操作の結果通知
  - `components/ui/toaster.tsx`, `components/ui/toast.tsx`, `components/ui/use-toast.ts`
- **v2**: トースト通知システムが存在しない。操作結果のフィードバックがない

### 1-2. Google One Tap ログイン
- **v1**: `@react-oauth/google` の `GoogleLogin` コンポーネントで `useOneTap` を有効化（`components/root/LoginForm.tsx:67`）
  - ページ訪問時に自動でGoogle One Tapプロンプトが表示される
- **v2**: カスタム `GoogleSignInButton`（GIS直接利用）でボタンのみ。One Tap未対応

### 1-3. アカウント削除機能
- **v1**: `useUserSettings` に `handleDeleteAccount` が実装（`hooks/feature/setting/useUserSettings.ts:68`）
- **v2**: 設定画面にアカウント削除UIなし。ローカルデータ削除のみ

### 1-4. オフラインデータのビジュアル表示（Daily画面）
- **v1**: Daily画面でオフライン（未同期）のログに対して:
  - `opacity-70 border-orange-200` のスタイル適用
  - `UpdateIcon` の回転アニメーション（同期中アイコン）
  - `isOfflineData(log)` による判定（`components/daily/DailyPage.tsx:42-65`）
- **v2**: ログの同期状態のビジュアル表示なし

### 1-5. 目標カードの「やらなかった日付」表示
- **v1**: GoalCardDisplayで `showInactiveDates` 設定がONの場合、目標カード下部に当月のやらなかった日付を表示（`components/goal/GoalCardDisplay.tsx:165-181`）
  - 最大3件表示 + 「他N日」
- **v2**: 設定項目 `showInactiveDates` は存在するが、GoalCardで消費されていない。UIに反映されない

### 1-6. EventBus / グローバル日付同期
- **v1**: `EventBusProvider` + `EventBusAdapter` + `DateProvider` + `useGlobalDate` でページ間の日付を同期
  - ActikoページとDailyページで日付が連動
  - `hooks/useGlobalDate.ts`, `providers/DateProvider.tsx`, `providers/EventBusProvider.tsx`
- **v2**: 各ページが独立したローカル日付stateを持つ。ページ間の日付連動なし

### 1-7. ネットワーク状態監視フック
- **v1**: `useNetworkStatus` フック（`hooks/useNetworkStatus.ts`）
  - オンライン/オフライン検出
  - シミュレートオフラインモード（開発用）
  - `@packages/frontend-shared` の共通フックを使用
- **v2**: 専用のネットワーク状態フックなし（syncEngineが内部的にハンドルしている可能性はある）

---

## 2. 機能的に同等だがUIに微差があるもの

### 2-1. 記録ダイアログのメモフィールド（Actiko画面）
- **v1**: `ActivityLogCreateForm` にメモ入力フィールドが**ない**（数量 + 種類選択 + 記録ボタンのみ）
- **v2**: `LogFormBody` にメモ入力フィールドが**ある**（`components/common/LogFormBody.tsx:109-118`）
- → **v2の方が機能が多い**（メモ付き記録が可能）

### 2-2. 目標詳細モーダル vs インライン展開
- **v1**: `GoalDetailModal`（Dialogコンポーネント）でモーダル表示
  - プログレスバー、期限までの日数、活動日数、最大活動量、最大連続活動日数、目標達成日数
- **v2**: `GoalStatsDetail`（インライン展開）でアコーディオン表示
  - 活動日数、達成日数（達成率%付き）、最大連続日数、平均活動量、最大活動量、14日間ヒートマップ
- → **v2の方が情報量が多い**（平均・達成率・ヒートマップ追加）。ただしv1の「期限までの日数」カウントダウンはv2にない

### 2-3. 目標カードのプログレス表示
- **v1**: 背景グラデーション（左→右）で進捗率を色で表現（`GoalCardDisplay.tsx:64-71`）
- **v2**: 独立したプログレスバー（h-1.5の細いバー）+ 「N日経過/全N日」表示（`GoalCard.tsx:317-328`）
- → v2はプログレスバーが別で表示される形式。v1のグラデーション背景はv2にない

### 2-4. 目標カードのインライン編集
- **v1**: カードクリックでGoalCardEditFormに切り替わり、日次目標量を編集（`GoalCardEditForm.tsx`）
- **v2**: 日次目標量をタップするだけでインライン input が出現（`GoalCard.tsx:206-226`）。さらに完全な編集は`EditGoalForm`で
- → v2の方がインライン編集がスムーズ

### 2-5. Stats画面のサマリー
- **v1**: `SummaryTable`（日別・週別合計値テーブル）のみ
- **v2**: `SummarySection`（合計・日平均・記録日数の3カラム）+ `SummaryTable`
- → **v2の方がサマリー表示が充実**

### 2-6. 日付ヘッダー
- **v1**: `ActivityDateHeader`コンポーネント — 「今日」ボタン（ClockIcon）+ 前/次ボタン + 日付テキスト + カレンダーPopover
  - v1の「今日」ボタンは独立したClockIconアイコン
- **v2**: 各ページ内にインラインで実装 — 前/次ボタン + 日付（クリックでCalendarPopover）
  - v2は日付テキスト自体をクリックでカレンダーが開く。「今日」ボタンは独立していないが、今日の場合は `date-pill-today` スタイルが適用される

### 2-7. タスク操作（Tasks画面）
- **v1**: TaskGroupコンポーネント内にアーカイブ・今日やるボタンが埋め込み。TaskEditDialogもTaskGroup内で管理
- **v2**: TasksPage側でonToggleDone, onEdit, onDelete, onArchive, onMoveToTodayを渡す形式。DeleteConfirmDialogも独立コンポーネント

### 2-8. 設定画面のレイアウト
- **v1**: シンプルなCheckboxとLabel（shadcn/ui）、ログアウトボタンが設定画面内にある
- **v2**: セクションごとにカード化、ヘッダー付き、ローカルデータ削除機能（インライン確認UI）、アプリ情報セクション追加。ログアウトはハンバーガーメニュー内

---

## 3. v1にあるがv2で不要になった機能

### 3-1. `@react-oauth/google` の `GoogleOAuthProvider`
- **v1**: main.tsx / AppProvidersで `GoogleOAuthProvider` をラップ
- **v2**: GISスクリプトを直接ロードする `GoogleSignInButton` に置き換え。Provider不要

### 3-2. `DateProvider` / `DateContext`
- **v1**: Contextで日付をグローバル管理
- **v2**: 各ページがローカルstateで日付を管理。グローバルProviderは不要

### 3-3. `AppProviders`（複合Provider）
- **v1**: `GoogleOAuthProvider`, `EventBusProvider`, `QueryClientProvider` を束ねる
- **v2**: main.tsxで直接 `QueryClientProvider` + `RouterProvider` のみ

### 3-4. shadcn/ui コンポーネント群
- **v1**: `Dialog`, `Form`, `FormField`, `RadioGroup`, `Select`, `Sheet`, `Accordion`, `Table`, `Tabs` 等の shadcn/ui コンポーネント
- **v2**: ネイティブHTML + Tailwind + ModalOverlayで統一。shadcn/ui依存なし

---

## 4. まとめ: v2で実装が必要な項目（優先度順）

| 優先度 | 機能 | 影響範囲 |
|--------|------|----------|
| **高** | Toast通知システム | 全画面 — 操作結果のフィードバックなし |
| **高** | 目標カード「やらなかった日付」表示 | Goal画面 — 設定はあるがUI未反映 |
| **中** | Google One Tapログイン | Login画面 — UX向上 |
| **中** | オフラインデータのビジュアル表示 | Daily画面 — 同期状態の視認性 |
| **中** | 目標詳細の「期限までの日数」表示 | Goal画面 — カウントダウン情報 |
| **低** | アカウント削除機能 | 設定画面 — ほぼ使われない機能 |
| **低** | ネットワーク状態監視UI | 全画面 — syncEngineが内部管理している可能性 |
| **低** | ページ間日付同期 | Actiko↔Daily — v2はページ独立設計のためUX的に問題ない可能性 |

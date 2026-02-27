# mobile-v2 ↔ frontend-v2 統一レポート

## 概要

statsページを除く全mobile-v2ページについて、frontend-v2（Web版）とロジック・UIをコードレベルで統一した。

## 対象ページ一覧

| ページ | ファイル数 | 主な変更 |
|--------|-----------|---------|
| Actiko | 6ファイル | useActikoPageフック新規作成、ActivityCard/RecordDialog/CreateActivityDialog/EditActivityDialog書き換え |
| Daily | 7ファイル | useDailyPageフック新規作成、TaskList新規作成、DailyPage/LogCard/CreateLogDialog/EditLogDialog書き換え |
| Goals | 6ファイル | useGoalsPageフック新規作成、types.ts新規作成、GoalsPage/GoalCard/CreateGoalDialog/EditGoalForm書き換え |
| Tasks | 8ファイル | useTasksPageフック新規作成、taskGrouping.ts/types.ts/DeleteConfirmDialog新規作成、TasksPage/TaskCard/TaskGroup/TaskCreateDialog/TaskEditDialog書き換え |
| Settings | 1ファイル | SettingsPage全面書き換え |
| CSV | 2ファイル | CSVImportModal/CSVExportModal書き換え |
| 共通 | 2ファイル | LogFormBody全面書き換え（useLogFormフック連携）、ModalOverlay維持 |

---

## ページ別差分と修正内容

### 1. Actiko ページ

#### ActikoPage.tsx
- **差分**: モバイルはロジックがコンポーネント内にベタ書き。Webはコロケーション型フック（useActikoPage）でロジック分離
- **修正**: `useActikoPage.ts` を新規作成し、Web版と同じ構造に変更（date, activities, selectedActivity, dialogOpen, editActivity等のステート管理）
- **差分**: モバイルにはタイマー表示がなかった
- **修正**: Web版同様のタイマーインジケータ（Timer/Square/Xアイコン、「停止して記録」「取消」ボタン）を追加
- **差分**: FlatListのgridData型が不正確
- **修正**: GridItem型を定義してsentinelアイテム(`__add__`)と通常アクティビティを型安全に扱うよう修正

#### ActivityCard.tsx
- **差分**: モバイルにはisDone（記録済み）表示とonEdit（編集ボタン）がなかった
- **修正**: `isDone` prop追加（emerald背景で記録済み表示）、Pencilアイコンの編集ボタンを右上に追加

#### RecordDialog.tsx
- **差分**: モバイルは個別フィールド管理、WebはLogFormBody共通コンポーネントに委譲
- **修正**: LogFormBody（`{activity, date, onDone}`インターフェース）に委譲する構造に変更。内部のuseLogFormがタイマー・手動入力の切り替えや種別選択を一元管理

#### CreateActivityDialog.tsx
- **差分**: モバイルにはkinds（種別）管理機能とカラー設定がなかった
- **修正**: Web版と同様のkinds追加UIとCOLOR_PALETTEによる自動カラー割り当てを追加

#### EditActivityDialog.tsx
- **差分**: モバイルのconfirm()呼び出しによる削除確認、showCombinedStats/kinds編集なし
- **修正**: confirm()をインライン2段階確認UIに変更（「削除」→「本当に削除」）。showCombinedStatsトグル、kinds管理UI（追加・削除・カラー表示）を追加。画像アップロード機能は維持

---

### 2. Daily ページ

#### DailyPage.tsx
- **差分**: モバイルはアクティビティログのみ表示。Webは「アクティビティ」セクションと「タスク」セクションの2セクション構成
- **修正**: `useDailyPage.ts` を新規作成。Web版と同じ2セクション構成（アクティビティ + タスク）に変更。各セクションに「+ 追加」ボタン

#### TaskList.tsx（新規作成）
- **差分**: モバイルにはDailyページ内のタスクリストがなかった
- **修正**: Web版TaskListと同等のチェックボックス付きタスクリストコンポーネントを新規作成

#### LogCard.tsx
- **差分**: モバイルはonLongPressで編集、WebはonPressで編集
- **修正**: onLongPressをonPressに変更。syncStatusインジケータ表示を維持

#### CreateLogDialog.tsx
- **差分**: モバイルはModalOverlay内にフォーム直接配置。Webは2ステップフロー（アクティビティ選択 → フォーム入力）
- **修正**: Web版と同じ2ステップフロー。Step1でアクティビティリスト表示、Step2でLogFormBodyに委譲。戻るボタン（ChevronLeft）付き

#### EditLogDialog.tsx
- **差分**: モバイルはAlert.alert()で削除確認
- **修正**: インライン2段階確認UIに変更（Trash2アイコン → 「削除」ボタン）。種別セレクターにカラードット表示を追加

---

### 3. Goals ページ

#### GoalsPage.tsx
- **差分**: モバイルはgoals一覧のみ。Webはcurrent/past分離、展開可能カード、目標からの記録機能
- **修正**: `useGoalsPage.ts` 新規作成。Web版と同じcurrentGoals/pastGoals分離、GoalCardの展開、RecordDialogへの連携

#### GoalCard.tsx
- **差分**: モバイルは簡素なカード表示。Webはステータスバッジ、残高表示、進捗バー、展開可能な詳細、アクションボタン
- **修正**: Web版と同等の機能を実装:
  - ステータスバッジ（順調/負債あり/終了/達成ペース）
  - 残高表示（+/- 数値、色分け）
  - 進捗バー（経過日数/全日数）
  - 展開可能な詳細（目標合計、実績合計、残高）
  - アクションボタン（PlusCircle=記録、Pencil=編集、Trash2=削除）
  - インライン2段階削除確認

#### CreateGoalDialog.tsx
- **差分**: モバイルはセレクトUI。Webはグリッド形式のアクティビティ選択
- **修正**: Web版と同じグリッド形式のアクティビティ選択UI、DatePickerField、バリデーションエラー表示

#### EditGoalForm.tsx
- **差分**: モバイルはモーダル形式。Webはインラインフォーム
- **修正**: Web版と同じインラインフォーム形式に変更。日次目標、日付範囲、終了・削除の2段階確認を実装

---

### 4. Tasks ページ

#### TasksPage.tsx
- **差分**: モバイルは単純リスト。Webはアクティブ/アーカイブタブ、タイムライン別グループ化、完了済み/未来タスクのトグル
- **修正**: `useTasksPage.ts` 新規作成。Web版と同等の構造:
  - アクティブ/アーカイブ済みタブ
  - タイムライン別グループ（期限切れ、今日締切、今日開始、進行中、今週締切）
  - 「未来のタスク」「完了済み」の折りたたみトグル
  - DeleteConfirmDialog（インライン2段階確認）

#### TaskCard.tsx
- **差分**: モバイルはonLongPressメニュー方式。Webはインラインアクションボタン
- **修正**: onLongPressを廃止。Web版と同じインラインアクションボタン:
  - CheckCircle2/Circle: 完了トグル
  - CalendarCheck: 今日に移動
  - Archive: アーカイブ
  - Pencil: 編集
  - Trash2: 削除
  - 日付表示（CalendarDays）、メモプレビュー（FileText）

#### TaskGroup.tsx
- **差分**: モバイルはchildren prop方式。Webはtasks prop方式でTaskCardを内部レンダリング
- **修正**: Web版と同じtasks prop方式に変更。title, titleColor, highlight, completed, archived props、各種ハンドラをTaskCardに伝播

#### TaskCreateDialog.tsx
- **差分**: Web版にはdefaultDateとDatePickerFieldがある
- **修正**: defaultDate prop、DatePickerFieldの使用を維持

#### TaskEditDialog.tsx
- **差分**: モバイルにはonDeleteやisArchived対応がなかった
- **修正**: onDelete prop、isArchived表示を追加

#### taskGrouping.ts（新規作成）
- Web版の `groupTasksByTimeline` 関数をそのまま移植

#### types.ts（新規作成）
- `@packages/domain/task/types` からTaskItem, GroupedTasks, GroupingOptionsを再エクスポート

#### DeleteConfirmDialog.tsx（新規作成）
- インライン2段階削除確認ダイアログ

---

### 5. Settings ページ

#### SettingsPage.tsx
- **差分**: モバイルはログアウトのみ。Webにはアプリ設定（3つのトグル）、データ管理（CSV、ローカルデータ削除）、アカウント管理が完備
- **修正**: Web版と同等の全機能を実装:
  - ユーザーID表示
  - アプリ設定セクション（起動時目標表示、目標グラフ非表示、やらなかった日付表示のトグル）
  - データ管理セクション（CSVインポート/エクスポート、ローカルデータ削除）
  - アカウントセクション（アカウント削除、ログアウト）
  - 全削除操作にインライン2段階確認UI

---

### 6. CSV

#### CSVImportModal.tsx
- **差分**: UI構造がWeb版と異なっていた
- **修正**: Web版と同じステップインジケータ（ファイル選択 → プレビュー）、プログレスバー、成功/エラーメッセージ表示に統一

#### CSVExportModal.tsx
- **差分**: 成功/エラー表示がなかった
- **修正**: CheckCircleアイコン付き成功メッセージ、エラー表示を追加。Download アイコン付きボタンに統一

---

### 7. 共通コンポーネント

#### LogFormBody.tsx
- **差分**: モバイルは個別フィールドのprops（quantityUnit, kinds, quantity, ...）。Webは`{activity, date, onDone}` インターフェースでuseLogFormフック内部管理
- **修正**: Web版と同じ `{activity, date, onDone}` インターフェースに変更。内部で `useLogForm` フックを使用してタイマー/手動入力タブ切り替え、種別セレクター、数量・メモフィールドを一元管理

#### useLogForm.ts（新規作成）
- Web版のuseLogFormをRN用に移植。タイマー制御、手動入力、種別選択、保存処理を統合

---

## 横断的な修正パターン

### confirm()/Alert.alert() → インライン2段階確認
- 全ての `confirm()` / `Alert.alert()` をインライン2段階確認UIに置換
- パターン: 「削除」ボタン → 「本当に削除」ボタンに切り替わる
- 対象: EditActivityDialog, EditLogDialog, EditGoalForm, GoalCard, TasksPage, SettingsPage

### onLongPress → onPress + インラインアクション
- TaskCard, LogCardの `onLongPress` を `onPress` に変更
- TaskCardにインラインアクションボタン（編集、削除、アーカイブ等）を追加

### ロジック分離（コロケーション型フック）
- 全ページでロジックを `use*.ts` フックに分離
- 新規作成: useActikoPage, useDailyPage, useGoalsPage, useTasksPage
- パターン: フック = 状態・ハンドラ・データ取得、コンポーネント = JSX表示のみ

### 型定義の整理
- `types.ts` ファイルを新規作成（Goal, Tasks）
- `@packages/domain` の共有型を再エクスポート
- ページ固有の型はページディレクトリ内で定義

---

## 既知の残課題

### LucideIcon JSX型エラー（75件）
- React 19 と lucide-react-native の型互換性問題
- `'X' cannot be used as a JSX component` 系のエラー
- **ランタイムには影響なし**（実行時は正常動作）
- 根本修正: lucide-react-native のReact 19対応バージョンリリース待ち、またはtsconfig.jsonへの `skipLibCheck: true` 追加

### tsconfig.json 変更
- ルートtsconfig.jsonのexcludeに `apps/mobile-v2` を追加（React型バージョン競合を回避）
- mobile-v2は独自のtsconfig.json（expo/tsconfig.base拡張）で型チェック

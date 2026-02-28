# ページレベルHooksのfrontend-shared共通化

## ステータス

決定

## コンテキスト

frontend-v2（Web）とmobile-v2（React Native）でページレベルのhooksが重複している。両アプリは同じビジネスロジック・状態管理パターンを持つが、以下の差分により別々に実装されていた:

- **importパス**: `db/` vs `repositories/`
- **型定義**: `DexieActivity` vs `ActivityRecord`
- **FormEventハンドラ**: Web版は`React.FormEvent`を受け取る、RN版は引数なし
- **useLiveQuery**: Dexie版 vs カスタムラッパー

`packages/frontend-shared`には既に`createUseSyncEngine`等のファクトリDIパターンが確立されており、同パターンでhooksを共通化可能と判断した。

## 決定事項

### 共通化するhooks（9つ）

ファクトリ関数パターン`createUseXxx(deps)`で共通化し、各アプリの元hookファイルを薄いwrapperに置き換える。

| Hook | 難易度 | 主な抽象化ポイント |
|------|--------|-------------------|
| useTasksPage | LOW | importパスのみ異なる |
| useTaskCreateDialog | LOW | FormEvent除去、handler名統一 |
| useTaskEditDialog | LOW | FormEvent除去、handler名統一 |
| useGoalsPage | LOW | Activity型をActivityBaseに一般化 |
| useCreateGoalDialog | MEDIUM | ActivityBase化、resetForm追加 |
| useActikoPage | MEDIUM | iconBlobs取得をDI、useCallback統一 |
| useDailyPage | MEDIUM | kinds/tasks取得をDI、editingLog型統一 |
| useLogForm | MEDIUM | Activity型をActivityBase化、FormEvent除去 |
| useEditLogDialog | MEDIUM | Log型統一、useEffect state同期追加 |

**DI方針:**
- React hooks（useState, useMemo等）は`deps.react`で注入（Metro+pnpm環境のCJS初期化問題を回避。`createUseSyncEngine`と同じ理由）
- リポジトリ・syncEngine・サブhooksはdepsで注入
- `@packages/domain`の型・関数は共通hookから直接import可能

**FormEvent対応:**
- 共通hookはFormEventを受け取らない
- Web側wrapperで`e.preventDefault()`してから共通hookのhandlerを呼ぶ

### 共通化しないhooks（3つ）

| Hook | 理由 |
|------|------|
| useStatsPage | DB層が根本的に異なる。frontend-v2はDexieの`useLiveQuery(() => db.activityLogs.where("date").between(...))`、mobile-v2は`db.getAllAsync<LogRow>("SELECT * FROM activity_logs WHERE ...")`。共通ロジック約60%だが、DIで注入する部分（5つのDB呼び出し全て）が本体ロジックを超え、共通化のメリットがない |
| useCreateActivityDialog | 画像処理がプラットフォーム固有。frontend-v2はWeb Canvas API（`resizeImage(file, 256, 256)`）、mobile-v2はExpo API（`ImageManipulator`, `DocumentPicker`, `FileSystem`）。アイコン取り扱いも異なり（Web: File+blob、RN: emoji文字列のみ）、共通部分はフォーム状態管理のみ |
| useEditActivityDialog | Blob保存・プレビュー機構が根本的に異なる。frontend-v2はIndexedDBのblob + `data:` URLプレビュー、mobile-v2はExpo FileSystem。共通ロジック40%未満で、DI型定義のコストが実装コストを上回る |

## 結果

- **保守コスト削減**: 9つのhooksのロジック変更が1箇所で済む
- **品質向上**: mobile-v2の改善（`resetForm`, `useEffect` state同期）がfrontend-v2にも適用される
- **コンポーネント変更なし**: export名・型を維持するため、`.tsx`ファイルの変更は不要
- **ビルド設定変更なし**: 既存の`@packages/frontend-shared/*`パスエイリアスをそのまま利用

## 備考

- `groupTasksByTimeline`は両アプリで同一実装。将来的に`@packages/domain`への移動を検討
- Goal型（`Goal`, `CreateGoalPayload`, `UpdateGoalPayload`）も両アプリで同一。共通型定義ファイルに移動

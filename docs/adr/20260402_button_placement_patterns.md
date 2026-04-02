# ボタン配置パターン（Mobile / Web 統一規約）

## ステータス

決定

## コンテキスト

アプリ内の決定/キャンセル/削除ボタンの配置がプラットフォーム間で乖離しないよう、Mobileを正としたボタン配置ルールを明文化する。2026-04-02時点でMobileとWebの配置は既に一致しているが、今後の開発で崩れないようにADRとして記録する。

## 決定事項

### 共通原則

- ボタンは全て `FormButton` コンポーネントを使う（variant: `primary` / `secondary` / `danger` / `dangerConfirm`）
- 横並びは `flex-row gap-2`（Mobile）/ `flex gap-2`（Web）

### パターン一覧

#### A. 2ボタン（キャンセル + 保存/作成）

```
[Cancel(secondary, flex-1)] [Save(primary, flex-1)]
```

- 左: キャンセル（secondary）
- 右: 保存/作成（primary）
- 両方 `flex-1` で均等幅
- 使用箇所: TaskCreateDialog, CreateGoalDialog, ReorderActivitiesDialog

#### B. 2ボタン（削除 + 保存）― インライン2段階確認

```
[Delete(danger→dangerConfirm, px-4)] [Save(primary, flex-1)]
```

- 左: 削除（`danger` → タップで `dangerConfirm` に切替）
- 右: 保存（primary, `flex-1` で残りの幅を取る）
- 削除ボタンは `px-4` 固定幅
- 使用箇所: EditActivityDialog, EditLogDialog

#### C. 3ボタン（削除 + キャンセル + 保存）― スペーサー分離

```
[Delete(danger, px-4)] [spacer(flex-1)] [Cancel(secondary, px-4)] [Save(primary, px-4)]
```

- 左端: 削除（danger）
- 中央: `flex-1` のスペーサーで物理的に分離
- 右側: キャンセル + 保存が並ぶ
- 全ボタン `px-4` 固定幅
- 使用箇所: TaskEditDialog

#### D. 複数Dangerアクション + 保存

```
[Delete(danger→dangerConfirm, px-3)] [Deactivate(danger→dangerConfirm, px-4)] [Save(primary, flex-1)]
```

- 左側にDangerアクション群（それぞれインライン2段階確認）
- 右端に保存（`flex-1`）
- 使用箇所: EditGoalButtons / EditGoalFormButtons

#### E. 単一ボタン（保存/作成のみ）

```
[Save(primary, w-full)]
```

- 全幅の単一ボタン
- キャンセルはModalOverlayのXボタンで対応
- 使用箇所: CreateActivityDialog, ManualMode, NumpadMode, CounterMode, TimerMode

#### F. 削除確認ダイアログ（2ボタン、均等）

```
[Cancel(secondary, flex-1)] [Confirm(dangerConfirm, flex-1)]
```

- 左: キャンセル（secondary）
- 右: 削除確認（dangerConfirm）
- 使用箇所: DeleteConfirmDialog

#### G. インライン削除確認（カード内・リスト内）

```
[Delete(red bg)] [Cancel(gray border)]
```

- 左: 削除実行（赤背景）
- 右: 取消（灰枠）
- 使用箇所: GoalCardActions, FreezePeriodManager, AccountSection, DataManagementSection

#### H. フォーム内 Cancel + Confirm（右寄せ）

```
                    [Cancel(secondary, px-4)] [Confirm(primary, px-4)]
```

- `justify-end` で右寄せ
- 使用箇所: FreezePeriodForm

### variant の意味

| variant | 見た目 | 用途 |
|---|---|---|
| `primary` | 黒背景 + 白文字 | 決定・保存・作成 |
| `secondary` | 灰枠 + 灰文字 | キャンセル・二次的アクション |
| `danger` | 赤枠 + 赤文字 | 削除（1段階目: 意図表明） |
| `dangerConfirm` | 赤背景 + 白文字 | 削除確認（2段階目: 実行） |

## 結果

- 新画面追加時はこのパターン表に従ってボタンを配置する
- パターン外のレイアウトが必要な場合はこのADRを更新する
- レビュー時にボタン配置がパターンに準拠しているか確認する

## 備考

- 特になし

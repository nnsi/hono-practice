# 記録モードUI注入設計

> 各活動の記録UIを `recordingMode` に応じて差し替え可能にする仕組み

---

## 現状の問題

- `LogFormBody` が「手動入力」と「タイマー」の2モードをif分岐で直接描画している
- モード判定は `quantityUnit` の文字列推論（`isTimeUnit()`）に依存しており、明示的なモード指定がない
- 新モード（カウンター、バイナリ、テンキー、チェック等）を追加するたびに `LogFormBody` が肥大化する

---

## 設計方針

### 1. `recordingMode` フィールドの追加

Activity モデルに明示的な `recordingMode` フィールドを追加する。

```typescript
// packages/domain/activity/recordingMode.ts

/** 記録モードの型定義 */
export type RecordingMode =
  | "manual"    // 現行の手動入力（数量 + メモ）
  | "timer"     // タイマー計測
  | "counter"   // +/- ボタンで増減
  | "binary"    // 2択（ActivityKind を2つ使う）
  | "numpad"    // テンキー入力
  | "check";    // やった/やらない の1タップ

export const RECORDING_MODES = [
  "manual", "timer", "counter", "binary", "numpad", "check",
] as const;
```

- `ActivityRecord` に `recordingMode: string` を追加
- DB マイグレーション: デフォルト `"manual"`、`isTimeUnit(quantityUnit)` が true なら `"timer"` で埋める
- **既存の `quantityUnit` による推論は廃止しない**（`recordingMode` 未設定の互換性のため fallback として残す）

### 2. レジストリパターンによるUI注入

```
┌─────────────────────────────────────────────────┐
│  RecordDialog / CreateLogDialog                 │
│  ┌───────────────────────────────────────────┐  │
│  │  LogFormBody                              │  │
│  │  ┌─────────────────────────────────────┐  │  │
│  │  │  resolveRecordingMode(activity)     │  │  │
│  │  │         ↓                           │  │  │
│  │  │  recordingModeRegistry[mode]        │  │  │
│  │  │         ↓                           │  │  │
│  │  │  <ModeComponent                     │  │  │
│  │  │    activity={...}                   │  │  │
│  │  │    context={sharedContext}           │  │  │
│  │  │  />                                 │  │  │
│  │  └─────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
```

#### レジストリ

```typescript
// apps/frontend-v2/src/components/recording-modes/registry.ts

import type { RecordingMode } from "@packages/domain/activity/recordingMode";
import type { RecordingModeComponent } from "./types";

/** モード → コンポーネントの対応表 */
const registry = new Map<RecordingMode, RecordingModeComponent>();

export function registerRecordingMode(
  mode: RecordingMode,
  component: RecordingModeComponent,
): void {
  registry.set(mode, component);
}

export function getRecordingModeComponent(
  mode: RecordingMode,
): RecordingModeComponent | undefined {
  return registry.get(mode);
}
```

#### モードコンポーネントの共通型

```typescript
// apps/frontend-v2/src/components/recording-modes/types.ts

import type { DexieActivity, DexieActivityKind } from "../../db/schema";

/** 全モードコンポーネントが受け取る共通 Props */
export type RecordingModeProps = {
  activity: DexieActivity;
  kinds: { id: string; name: string; color: string | null }[];
  date: string;
  onSave: (params: SaveLogParams) => Promise<void>;
  isSubmitting: boolean;
};

/** 記録保存時のパラメータ */
export type SaveLogParams = {
  quantity: number | null;
  memo: string;
  activityKindId: string | null;
};

/** レジストリに登録するコンポーネントの型 */
export type RecordingModeComponent = React.ComponentType<RecordingModeProps>;
```

**ポイント:**
- 各モードコンポーネントは `onSave(SaveLogParams)` だけを呼べば記録が完了する
- `quantity` / `memo` / `activityKindId` の管理は各モード内で自由に行える
- `isSubmitting` で送信中の二重タップを防ぐ
- タイマーモードのように追加の状態（elapsed time）が必要な場合は、モード内部で独自フックを使う

### 3. LogFormBody のリファクタリング

```typescript
// LogFormBody.tsx（リファクタリング後）

export function LogFormBody({ activity, date, onDone }: LogFormBodyProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { kinds } = useActivityKinds(activity.id);

  const mode = resolveRecordingMode(activity);
  const ModeComponent = getRecordingModeComponent(mode);

  if (!ModeComponent) {
    // フォールバック: 未登録モードは手動入力
    return <ManualMode activity={activity} kinds={kinds} ... />;
  }

  const handleSave = async (params: SaveLogParams) => {
    setIsSubmitting(true);
    await activityLogRepository.createActivityLog({
      activityId: activity.id,
      activityKindId: params.activityKindId,
      quantity: params.quantity,
      memo: params.memo,
      date,
      time: null,
    });
    syncEngine.syncActivityLogs();
    setIsSubmitting(false);
    onDone();
  };

  return (
    <ModeComponent
      activity={activity}
      kinds={kinds}
      date={date}
      onSave={handleSave}
      isSubmitting={isSubmitting}
    />
  );
}
```

### 4. resolveRecordingMode（互換性付きモード解決）

```typescript
// apps/frontend-v2/src/components/recording-modes/resolveRecordingMode.ts

import type { RecordingMode } from "@packages/domain/activity/recordingMode";
import { isTimeUnit } from "@packages/domain/time/timeUtils";
import type { DexieActivity } from "../../db/schema";

export function resolveRecordingMode(activity: DexieActivity): RecordingMode {
  // 明示的に設定されていればそれを使う
  if (activity.recordingMode) {
    return activity.recordingMode as RecordingMode;
  }
  // 互換性: quantityUnit から推論（recordingMode 未設定の既存データ向け）
  if (isTimeUnit(activity.quantityUnit)) {
    return "timer";
  }
  return "manual";
}
```

### 5. 共有UIパーツの切り出し

各モードが共通で使える部品を `recording-modes/parts/` に置く。

```
src/components/recording-modes/
├── registry.ts              # レジストリ
├── types.ts                 # 共通型
├── resolveRecordingMode.ts  # モード解決
├── setup.ts                 # 全モードの登録（アプリ起動時に1回呼ぶ）
├── parts/                   # 共有UIパーツ
│   ├── KindSelector.tsx     # 既存を移動
│   ├── MemoInput.tsx
│   └── SaveButton.tsx
└── modes/                   # 各モード実装
    ├── ManualMode.tsx       # 既存の手動入力を切り出し
    ├── TimerMode.tsx        # 既存のタイマーを切り出し
    ├── CounterMode.tsx      # 新規
    ├── BinaryMode.tsx       # 新規
    ├── NumpadMode.tsx       # 新規
    └── CheckMode.tsx        # 新規
```

### 6. モード登録（setup.ts）

```typescript
// apps/frontend-v2/src/components/recording-modes/setup.ts

import { registerRecordingMode } from "./registry";
import { ManualMode } from "./modes/ManualMode";
import { TimerMode } from "./modes/TimerMode";
// 新モードが増えたらここに追加するだけ

export function setupRecordingModes(): void {
  registerRecordingMode("manual", ManualMode);
  registerRecordingMode("timer", TimerMode);
  // registerRecordingMode("counter", CounterMode);
  // registerRecordingMode("binary", BinaryMode);
  // ...
}
```

アプリの `main.tsx` で `setupRecordingModes()` を呼ぶ。

---

## 段階的な移行戦略

### Phase 1: 基盤整備（今回のスコープ）
1. `RecordingMode` 型を `packages/domain` に定義
2. `ActivityRecord` に `recordingMode` フィールド追加
3. レジストリ・共通型・resolveRecordingMode を作成
4. 既存の手動入力・タイマーをモードコンポーネントとして切り出し
5. `LogFormBody` をレジストリ経由の描画に書き換え
6. 共有パーツ（KindSelector, MemoInput, SaveButton）を `parts/` に移動

### Phase 2: 新モード追加（後続）
- CounterMode, BinaryMode 等を `modes/` に追加し `setup.ts` で登録
- Activity 作成/編集画面にモード選択UIを追加
- バックエンドに `recordingMode` カラム追加 + マイグレーション

---

## 設計判断の理由

### なぜレジストリパターンか

- **switch/if文の排除**: `LogFormBody` がモードの詳細を知らなくて済む
- **独立した追加**: 新モードは `modes/` にファイルを作って `setup.ts` に1行追加するだけ
- **テスト容易性**: 各モードコンポーネントを単体でテスト可能
- **遅延読み込み対応**: 将来 `React.lazy()` で動的importに差し替えやすい

### なぜ Props に `onSave` を渡すか（フックではなく）

- 保存ロジック（repository呼び出し + sync）は全モード共通なので `LogFormBody` 側に持つ
- 各モードは「何を保存するか（quantity, memo, kindId）」だけを決める
- モード側に repository 依存を持ち込まないことで、モードコンポーネントの関心が純粋なUI操作に限定される

### quantityUnit 推論を残す理由

- `recordingMode` フィールド追加はDB変更を伴う
- バックエンドのマイグレーション前でもフロントが動くように、fallback として `isTimeUnit()` を残す
- 全データに `recordingMode` が行き渡った時点で削除可能

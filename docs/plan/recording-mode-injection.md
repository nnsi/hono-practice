# 記録モードUI注入設計

> 各活動の記録UIを `recordingMode` に応じて差し替え可能にする仕組み

---

## 現状の問題

- `LogFormBody` が「手動入力」と「タイマー」の2モードをif分岐で直接描画している
- モード判定は `quantityUnit` の文字列推論（`isTimeUnit()`）に依存しており、明示的なモード指定がない
- 新モード（カウンター、バイナリ、テンキー、チェック等）を追加するたびに `LogFormBody` が肥大化する
- frontend-v2 と mobile-v2 の両方に `LogFormBody` があり、同じロジックがプラットフォームごとに重複する

---

## 設計方針: ヘッドレスフック + 薄いレンダラー

既存の `createUseLogForm` ファクトリパターンを記録モード単位に拡張する。
各モードのロジック（状態管理・バリデーション・操作ハンドラ）をヘッドレスフックとして共有し、プラットフォーム側は描画だけを担う。

### 全体像

```
packages/domain/activity/
└── recordingMode.ts                ← RecordingMode 型定義

packages/frontend-shared/
└── recording-modes/
    ├── types.ts                    ← SaveLogParams, RecordingModeProps, 各モードの戻り値型
    ├── resolveRecordingMode.ts     ← activity → mode 解決ロジック
    └── modes/                      ← ヘッドレスフック（ロジックのみ、UI非依存）
        ├── createUseManualMode.ts
        ├── createUseTimerMode.ts
        ├── createUseCounterMode.ts
        ├── createUseNumpadMode.ts
        ├── createUseBinaryMode.ts
        └── createUseCheckMode.ts

apps/frontend-v2/src/components/recording-modes/
├── registry.ts                     ← Web用 Record<mode, Component>
├── parts/                          ← 共有UIパーツ（HTML + Tailwind）
│   ├── KindSelector.tsx
│   ├── MemoInput.tsx
│   └── SaveButton.tsx
└── modes/                          ← 薄いレンダラー（フックの戻り値を HTML で描画するだけ）
    ├── ManualMode.tsx
    ├── TimerMode.tsx
    └── ...

apps/mobile-v2/src/components/recording-modes/
├── registry.ts                     ← Native用 Record<mode, Component>
├── parts/                          ← 共有UIパーツ（React Native）
│   ├── KindSelector.tsx
│   ├── MemoInput.tsx
│   └── SaveButton.tsx
└── modes/                          ← 薄いレンダラー（フックの戻り値を RN で描画するだけ）
    ├── ManualMode.tsx
    ├── TimerMode.tsx
    └── ...
```

**層の責務:**

| 層 | 場所 | 責務 |
|---|---|---|
| ドメイン型 | `packages/domain` | `RecordingMode` union type |
| ロジック | `packages/frontend-shared` | 状態管理、バリデーション、ハンドラ（ヘッドレスフック） |
| 描画 | `apps/*/recording-modes/modes/` | フックの戻り値をプラットフォーム固有UIで描画 |

---

### 1. `recordingMode` フィールドの追加

```typescript
// packages/domain/activity/recordingMode.ts

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

- `ActivityRecord` / `ActivityBase` に `recordingMode: string` を追加
- DB マイグレーション: デフォルト `"manual"`、`isTimeUnit(quantityUnit)` が true なら `"timer"` で埋める
- **既存の `quantityUnit` による推論は fallback として残す**（`recordingMode` 未設定の既存データ互換）

### 2. 共通型（プラットフォーム非依存）

```typescript
// packages/frontend-shared/recording-modes/types.ts

import type { ActivityBase } from "../hooks/types";

/** 記録保存時のパラメータ */
export type SaveLogParams = {
  quantity: number | null;
  memo: string;
  activityKindId: string | null;
};

/** 全モードコンポーネントが受け取る共通 Props */
export type RecordingModeProps = {
  activity: ActivityBase;
  kinds: { id: string; name: string; color: string | null }[];
  date: string;
  onSave: (params: SaveLogParams) => Promise<void>;
  isSubmitting: boolean;
};
```

### 3. ヘッドレスフック（各モードのロジック）

各モードの状態管理・操作ロジックをファクトリ関数として共有する。
プラットフォーム側は戻り値の「ビューモデル」を受け取って描画するだけ。

#### ManualMode（現行の手動入力を切り出し）

```typescript
// packages/frontend-shared/recording-modes/modes/createUseManualMode.ts

type UseManualModeDeps = {
  react: Pick<ReactHooks, "useState">;
};

export type ManualModeViewModel = {
  quantity: string;
  setQuantity: (v: string) => void;
  memo: string;
  setMemo: (v: string) => void;
  selectedKindId: string | null;
  setSelectedKindId: (id: string | null) => void;
  submit: () => void;
  isSubmitting: boolean;
};

export function createUseManualMode(deps: UseManualModeDeps) {
  return function useManualMode(props: RecordingModeProps): ManualModeViewModel {
    const [quantity, setQuantity] = deps.react.useState("1");
    const [memo, setMemo] = deps.react.useState("");
    const [selectedKindId, setSelectedKindId] = deps.react.useState<string | null>(null);

    const submit = () => {
      const parsed = quantity !== "" ? Number(quantity) : null;
      if (parsed !== null && !Number.isFinite(parsed)) return;
      props.onSave({ quantity: parsed, memo, activityKindId: selectedKindId });
    };

    return {
      quantity, setQuantity, memo, setMemo,
      selectedKindId, setSelectedKindId,
      submit, isSubmitting: props.isSubmitting,
    };
  };
}
```

#### CounterMode（新規）

```typescript
// packages/frontend-shared/recording-modes/modes/createUseCounterMode.ts

export type CounterModeViewModel = {
  value: number;
  steps: number[];
  increment: (step: number) => void;
  decrement: (step: number) => void;
  submit: () => void;
  isSubmitting: boolean;
};

export function createUseCounterMode(deps: { react: Pick<ReactHooks, "useState"> }) {
  return function useCounterMode(props: RecordingModeProps): CounterModeViewModel {
    const [value, setValue] = deps.react.useState(0);
    const steps = [1, 10, 100];

    return {
      value,
      steps,
      increment: (step: number) => setValue((v) => v + step),
      decrement: (step: number) => setValue((v) => Math.max(0, v - step)),
      submit: () => props.onSave({ quantity: value, memo: "", activityKindId: null }),
      isSubmitting: props.isSubmitting,
    };
  };
}
```

#### TimerMode（既存タイマーを切り出し）

```typescript
// packages/frontend-shared/recording-modes/modes/createUseTimerMode.ts

export type TimerModeViewModel = {
  // タイマー状態
  isRunning: boolean;
  elapsedTime: number;
  formattedTime: string;
  isStopped: boolean;
  // 操作
  start: () => void;
  stop: () => void;
  reset: () => void;
  // 停止後の表示・操作
  convertedQuantity: number;
  quantityUnit: string;
  selectedKindId: string | null;
  setSelectedKindId: (id: string | null) => void;
  submit: () => void;
  isSubmitting: boolean;
};

export function createUseTimerMode(deps: {
  react: Pick<ReactHooks, "useState">;
  useTimer: (activityId: string) => TimerReturn;
}) {
  return function useTimerMode(props: RecordingModeProps): TimerModeViewModel {
    const timer = deps.useTimer(props.activity.id);
    const [selectedKindId, setSelectedKindId] = deps.react.useState<string | null>(null);
    const timeUnitType = getTimeUnitType(props.activity.quantityUnit);

    return {
      isRunning: timer.isRunning,
      elapsedTime: timer.elapsedTime,
      formattedTime: formatElapsedTime(timer.elapsedTime),
      isStopped: !timer.isRunning && timer.elapsedTime > 0,
      start: () => timer.start(),
      stop: timer.stop,
      reset: timer.reset,
      convertedQuantity: convertSecondsToUnit(timer.getElapsedSeconds(), timeUnitType),
      quantityUnit: props.activity.quantityUnit,
      selectedKindId,
      setSelectedKindId,
      submit: () => {
        const seconds = timer.getElapsedSeconds();
        const qty = convertSecondsToUnit(seconds, timeUnitType);
        const startDate = timer.getStartDate();
        const memo = startDate ? generateTimeMemo(startDate, new Date()) : "";
        props.onSave({ quantity: qty, memo, activityKindId: selectedKindId });
        timer.reset();
      },
      isSubmitting: props.isSubmitting,
    };
  };
}
```

### 4. 薄いレンダラー（プラットフォーム別）

フックの戻り値を消費して描画するだけ。ロジックは一切持たない。

```tsx
// apps/frontend-v2/src/components/recording-modes/modes/CounterMode.tsx

import type { RecordingModeProps } from "@packages/frontend-shared/recording-modes/types";
import { useCounterMode } from "./useCounterMode"; // ← createUseCounterMode で生成済み
import { SaveButton } from "../parts/SaveButton";

export function CounterMode(props: RecordingModeProps) {
  const vm = useCounterMode(props);

  return (
    <div className="space-y-5">
      <div className="text-5xl font-bold text-center tabular-nums">
        {vm.value.toLocaleString()}
      </div>
      <div className="space-y-2">
        {vm.steps.map((s) => (
          <div key={s} className="flex gap-2">
            <button onClick={() => vm.decrement(s)} className="...">-{s}</button>
            <button onClick={() => vm.increment(s)} className="...">+{s}</button>
          </div>
        ))}
      </div>
      <SaveButton onClick={vm.submit} disabled={vm.isSubmitting} />
    </div>
  );
}
```

```tsx
// apps/mobile-v2/src/components/recording-modes/modes/CounterMode.tsx

import type { RecordingModeProps } from "@packages/frontend-shared/recording-modes/types";
import { useCounterMode } from "./useCounterMode";
import { SaveButton } from "../parts/SaveButton";

export function CounterMode(props: RecordingModeProps) {
  const vm = useCounterMode(props);

  return (
    <View style={styles.container}>
      <Text style={styles.value}>{vm.value.toLocaleString()}</Text>
      {vm.steps.map((s) => (
        <View key={s} style={styles.stepRow}>
          <Pressable onPress={() => vm.decrement(s)}><Text>-{s}</Text></Pressable>
          <Pressable onPress={() => vm.increment(s)}><Text>+{s}</Text></Pressable>
        </View>
      ))}
      <SaveButton onPress={vm.submit} disabled={vm.isSubmitting} />
    </View>
  );
}
```

**両方とも `useCounterMode(props)` を呼んで `vm` を受け取り、描画だけが異なる。**

### 5. resolveRecordingMode（共有ロジック）

```typescript
// packages/frontend-shared/recording-modes/resolveRecordingMode.ts

import type { RecordingMode } from "@packages/domain/activity/recordingMode";
import { isTimeUnit } from "@packages/domain/time/timeUtils";
import type { ActivityBase } from "../hooks/types";

type ActivityWithMode = ActivityBase & { recordingMode?: string };

export function resolveRecordingMode(activity: ActivityWithMode): RecordingMode {
  if (activity.recordingMode) {
    return activity.recordingMode as RecordingMode;
  }
  if (isTimeUnit(activity.quantityUnit)) {
    return "timer";
  }
  return "manual";
}
```

### 6. プラットフォーム別レジストリ（静的 Record）

```typescript
// apps/frontend-v2/src/components/recording-modes/registry.ts

import type { RecordingMode } from "@packages/domain/activity/recordingMode";
import type { RecordingModeProps } from "@packages/frontend-shared/recording-modes/types";
import { ManualMode } from "./modes/ManualMode";
import { TimerMode } from "./modes/TimerMode";

const modes: Record<RecordingMode, React.ComponentType<RecordingModeProps>> = {
  manual: ManualMode,
  timer: TimerMode,
  counter: ManualMode,  // 未実装モードは manual にフォールバック
  binary: ManualMode,
  numpad: ManualMode,
  check: ManualMode,
};

export const getRecordingModeComponent = (
  mode: RecordingMode,
): React.ComponentType<RecordingModeProps> => modes[mode];
```

- `Record<RecordingMode, ...>` により、`RecordingMode` に値を追加すると全レジストリで型エラーが出る
- `setup.ts` / `main.tsx` への初期化呼び出し不要

### 7. LogFormBody のリファクタリング

```typescript
// apps/frontend-v2/src/components/common/LogFormBody.tsx

export function LogFormBody({ activity, date, onDone }: LogFormBodyProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { kinds } = useActivityKinds(activity.id);

  const mode = resolveRecordingMode(activity);
  const ModeComponent = getRecordingModeComponent(mode);

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

---

## 段階的な移行戦略

### Phase 1: 基盤整備
1. `RecordingMode` 型を `packages/domain` に定義
2. `ActivityBase` に `recordingMode` フィールド追加
3. `packages/frontend-shared/recording-modes/` にヘッドレスフック + 共通型 + resolveRecordingMode を作成
4. **frontend-v2 側:**
   - 既存の手動入力・タイマーのロジックをヘッドレスフック (`createUseManualMode`, `createUseTimerMode`) に移行
   - 薄いレンダラーを `recording-modes/modes/` に作成
   - 共有パーツ（KindSelector, MemoInput, SaveButton）を `recording-modes/parts/` に切り出し
   - `LogFormBody` をレジストリ経由の描画に書き換え
5. **mobile-v2 側:**
   - 同じヘッドレスフックを消費するRNレンダラーを作成

### Phase 2: 新モード追加
- ヘッドレスフック (`createUseCounterMode` 等) を `packages/frontend-shared` に追加
- 各プラットフォームにレンダラーを追加
- レジストリのフォールバックを実コンポーネントに差し替え
- Activity 作成/編集画面にモード選択UIを追加

### Phase 3: バックエンド対応
- `activity` テーブルに `recording_mode` カラム追加 + マイグレーション
- API の create/update で `recordingMode` を受け取り・返却
- 同期エンジンで `recordingMode` を双方向同期

---

## 設計判断の理由

### なぜヘッドレスフック + 薄いレンダラーか

既存の `createUseLogForm` / `createUseActikoPage` 等と同じパターン。

- **ロジック重複の排除**: Counter の増減ロジック、Numpad の桁入力バッファリング等をプラットフォームごとに書かずに済む
- **テスト容易性**: ヘッドレスフックはUIフレームワークなしで単体テスト可能。ビューモデルの値を検証するだけ
- **レンダラーの薄さ**: プラットフォーム側は `vm.value` / `vm.submit()` 等を描画に変換するだけ。ロジックの変更がレンダラーに波及しない

### なぜ3層分離か

- `packages/domain` — 型: どちらのプラットフォームにも依存しない
- `packages/frontend-shared` — ロジック: React Hooks のDIで両プラットフォームから使える
- `apps/*/recording-modes/` — 描画: HTML or RN のみ

### なぜ静的 Record か

- モードは全て静的に決まっている。動的拡張不要
- `Record<RecordingMode, Component>` で全モード網羅を型レベルで強制
- `setup.ts` + `main.tsx` 初期化が不要

### なぜ Props に `onSave` を渡すか

- 保存ロジック（repository + sync）は全モード共通 → `LogFormBody` 側に集約
- 各モードは「何を保存するか」だけを決める
- モード側に repository 依存を持ち込まない

### quantityUnit 推論を残す理由

- バックエンドのマイグレーション前でもフロントが動くように fallback として残す
- 全データに `recordingMode` が行き渡った時点で削除可能

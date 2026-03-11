# 記録モードUI注入設計

> 各活動の記録UIを `recordingMode` に応じて差し替え可能にする仕組み

---

## 現状の問題

- `LogFormBody` が「手動入力」と「タイマー」の2モードをif分岐で直接描画している
- モード判定は `quantityUnit` の文字列推論（`isTimeUnit()`）に依存しており、明示的なモード指定がない
- 新モード（カウンター、バイナリ、テンキー、チェック等）を追加するたびに `LogFormBody` が肥大化する
- frontend-v2 と mobile-v2 の両方に `LogFormBody` があり、同じ構造の問題がプラットフォームごとに存在する

---

## 設計方針

### 全体像: 3層分離

既存の `packages/frontend-shared` ファクトリパターンに合わせ、ロジック共有・UI分離の構成を取る。

```
packages/domain/activity/
└── recordingMode.ts              ← 型定義（RecordingMode union type）

packages/frontend-shared/
└── recording-modes/
    ├── types.ts                  ← SaveLogParams, RecordingModeProps（UI非依存）
    └── resolveRecordingMode.ts   ← activity → mode 解決ロジック

apps/frontend-v2/src/components/recording-modes/
├── registry.ts                   ← Web用 Record<mode, Component>
├── parts/                        ← 共有UIパーツ（HTML版）
│   ├── KindSelector.tsx
│   ├── MemoInput.tsx
│   └── SaveButton.tsx
└── modes/                        ← 各モード実装（HTML版）
    ├── ManualMode.tsx
    ├── TimerMode.tsx
    └── ...

apps/mobile-v2/src/components/recording-modes/
├── registry.ts                   ← Native用 Record<mode, Component>
├── parts/                        ← 共有UIパーツ（RN版）
│   ├── KindSelector.tsx
│   ├── MemoInput.tsx
│   └── SaveButton.tsx
└── modes/                        ← 各モード実装（RN版）
    ├── ManualMode.tsx
    ├── TimerMode.tsx
    └── ...
```

---

### 1. `recordingMode` フィールドの追加

Activity モデルに明示的な `recordingMode` フィールドを追加する。

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

**ポイント:**
- `activity` は `DexieActivity` ではなく `ActivityBase`（プラットフォーム非依存の最小型）
- 各モードコンポーネントは `onSave(SaveLogParams)` を呼ぶだけで記録完了
- `quantity` / `memo` / `activityKindId` の管理は各モード内で自由
- タイマーモードのように追加の状態（elapsed time）が必要な場合はモード内部で独自フックを使う

### 3. resolveRecordingMode（共有ロジック）

```typescript
// packages/frontend-shared/recording-modes/resolveRecordingMode.ts

import type { RecordingMode } from "@packages/domain/activity/recordingMode";
import { isTimeUnit } from "@packages/domain/time/timeUtils";
import type { ActivityBase } from "../hooks/types";

type ActivityWithMode = ActivityBase & { recordingMode?: string };

export function resolveRecordingMode(activity: ActivityWithMode): RecordingMode {
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

### 4. プラットフォーム別レジストリ（静的 Record）

`Map` + 実行時登録ではなく、型安全な `Record` リテラルを使う。

```typescript
// apps/frontend-v2/src/components/recording-modes/registry.ts

import type { RecordingMode } from "@packages/domain/activity/recordingMode";
import type { RecordingModeProps } from "@packages/frontend-shared/recording-modes/types";
import { ManualMode } from "./modes/ManualMode";
import { TimerMode } from "./modes/TimerMode";

/** モード → コンポーネント 静的対応表 */
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

**なぜ `Map` + 実行時登録ではなく `Record` か:**
- モードは静的に全て決まっている。動的登録の必要がない
- `Record<RecordingMode, ...>` にすると、`RecordingMode` に値を追加した時点で全キーの網羅が型エラーで強制される
- `setup.ts` も `main.tsx` への初期化呼び出しも不要

mobile-v2 にも同じ構造の `registry.ts` を置き、RN コンポーネントを対応させる。

### 5. LogFormBody のリファクタリング

```typescript
// apps/frontend-v2/src/components/common/LogFormBody.tsx（リファクタリング後）

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

`LogFormBody` の責務は「モード解決 + 保存ロジック」のみ。UI描画は完全にモードコンポーネントに委譲。

---

## 段階的な移行戦略

### Phase 1: 基盤整備
1. `RecordingMode` 型を `packages/domain` に定義
2. `ActivityBase` に `recordingMode` フィールド追加
3. `packages/frontend-shared/recording-modes/` に共通型 + resolveRecordingMode を作成
4. **frontend-v2 側:**
   - 既存の手動入力・タイマーをモードコンポーネントとして `recording-modes/modes/` に切り出し
   - 共有パーツ（KindSelector, MemoInput, SaveButton）を `recording-modes/parts/` に移動
   - `LogFormBody` をレジストリ経由の描画に書き換え
   - レジストリを `Record` リテラルで作成
5. **mobile-v2 側:**
   - 同様の構造で `recording-modes/` を作成（RN コンポーネント版）

### Phase 2: 新モード追加
- CounterMode, BinaryMode 等を各プラットフォームの `modes/` に追加
- レジストリの `Record` でフォールバックを実コンポーネントに差し替え
- Activity 作成/編集画面にモード選択UIを追加

### Phase 3: バックエンド対応
- `activity` テーブルに `recording_mode` カラム追加 + マイグレーション
- API の create/update で `recordingMode` を受け取り・返却
- 同期エンジンで `recordingMode` を双方向同期

---

## 設計判断の理由

### なぜ3層分離か

既存の `packages/frontend-shared` ファクトリパターンと一貫させるため。

- `createUseLogForm` がロジック共有 + DI でプラットフォーム差を吸収する既存パターン
- 記録モードの解決ロジック (`resolveRecordingMode`) もプラットフォーム非依存なので同じ場所に置く
- UIコンポーネントだけが Web / RN で異なる → 各 app の `recording-modes/modes/` に分離

### なぜ静的 Record か（Map + 実行時登録ではなく）

- モードは全て静的に決まっている。プラグインのような動的拡張は不要
- `Record<RecordingMode, Component>` は型レベルで全モードの網羅を強制する
- `setup.ts` + `main.tsx` 初期化呼び出しが不要でシンプル

### なぜ Props に `onSave` を渡すか（フックではなく）

- 保存ロジック（repository 呼び出し + sync）は全モード共通なので `LogFormBody` 側に持つ
- 各モードは「何を保存するか（quantity, memo, kindId）」だけを決める
- モード側に repository 依存を持ち込まないことで、モードコンポーネントの関心が UI 操作に限定される

### quantityUnit 推論を残す理由

- `recordingMode` フィールド追加は DB 変更を伴う
- バックエンドのマイグレーション前でもフロントが動くように fallback として残す
- 全データに `recordingMode` が行き渡った時点で削除可能

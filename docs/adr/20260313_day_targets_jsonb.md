# 曜日別目標（dayTargets）の JSONB カラム設計

## ステータス

決定

## コンテキスト

Debt フリーズの議論から派生し、曜日ごとに目標値を変えたいというニーズが出た。「平日は3km、土日は5km」「日曜は休み（目標0）」のようなユースケース。`docs/plan/debt-continuation-ideas.md` では 3-A'（曜日別目標）として定義されている。

debt-continuation-ideas.md の整理:
- **フリーズ（3-C）**: 旅行で来週休む — 例外的な不在
- **dayTargets（3-A'）**: 毎週土日はやらない — 恒常的なスケジュール
- dayTargets に `0` を指定すれば休みになるため、別途 `active_days` は不要

最初の案は `active_days integer[]`（有効曜日の配列）だったが、曜日ごとに目標値を変えたいというニーズには対応できない。

## 決定事項

`activity_goal` テーブルに `day_targets jsonb` (nullable) を追加。

```typescript
type DayTargets = {
  "1"?: number; // 月曜
  "2"?: number; // 火曜
  "3"?: number; // 水曜
  "4"?: number; // 木曜
  "5"?: number; // 金曜
  "6"?: number; // 土曜
  "7"?: number; // 日曜
};
```

### フォールバック設計

- `dayTargets` が `null`: 全曜日 `dailyTargetQuantity` が適用される（完全後方互換）
- `dayTargets` にキーが存在しない曜日: `dailyTargetQuantity` にフォールバック
- `dayTargets[曜日] === 0`: その曜日は休み扱い（目標なし、Debt も発生しない）

`getDailyTargetForDate(date, dayTargets, dailyTargetQuantity)` ヘルパーがこのロジックを一元管理。

### `dayTargets = 0`（休日）の統一的意味

- `goalBalance`: target=0 の日は Debt 計算から除外
- `goalStats` の `generateDailyRecords`: `achieved: true`（休日は達成済み扱い）
- `goalHeatmap`: 達成済み色で表示
- `getInactiveDates`: `getDailyTargetForDate` を使って休日をスキップ

### パフォーマンス

`goalBalance.ts` に fast path / slow path 分岐を実装:
- `dayTargets === null`: 既存の `countActiveDays * dailyTargetQuantity` の高速パス
- `dayTargets !== null`: 日別イテレーションに入る slow path

### 動的パターンのスコープ外

「筋トレ後2日休む」のような動的パターンは Debt と相性が悪い（次の目標日が前回の記録に依存するため Debt 計算が非決定的になる）。記録モード + Stats で振り返る使い方が適切と判断し、スコープ外とした。

### Zod バリデーション

リクエスト/レスポンスの Zod スキーマで `z.enum(["1","2","3","4","5","6","7"])` + `z.number().min(0)` に厳密化。DB 値は `parseDayTargets()` で正規化し、`as DayTargets` キャストを完全除去。

## 結果

- ユーザーが曜日ごとに目標値をカスタマイズ可能（0 設定で休日指定も可能）
- `dailyTargetQuantity` がフォールバックとして機能するため、既存ゴールへの影響ゼロ
- UI は `DayTargetsInput` コンポーネントとして frontend-v2 / mobile-v2 の両方に実装

## 備考

- `getDailyTargetForDate` 内の `(dayjs(date).day() || 7) as 1|2|3|4|5|6|7` は dayjs の型定義上の制約による `as` キャスト。ランタイムでは確実に 1-7 の範囲に収まる。
- `isDateFrozen` ヘルパーは O(days * freezePeriods) だが、フリーズ期間が数個を超えることは現実的にないため許容。

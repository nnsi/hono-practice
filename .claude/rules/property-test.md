# Property-based Test Rule

## 時刻ロジックを書いた時は property test を追加する

`packages/domain/` および `packages/sync-engine/` の **時刻依存ロジック**（日次・週次・月次の境界、タイムゾーン、streak、subscription期限、binary log aggregation など）を新規実装または変更したら、`@fast-check/vitest` の property test を必ず1本以上追加する。

### 対象（既に property test がある領域）

- `packages/domain/test/_property/`
  - `goalDayTarget.property.test.ts` — dayTargets / 日数計算 / 月跨ぎ・年跨ぎ・うるう年・タイムゾーン境界
  - `activityLog.property.test.ts` — 集計の和、順序非依存、JST/UTC帰属の整合
  - `streakSubscription.property.test.ts` — streak monotonic / gracePeriod境界
  - `regression.property.test.ts` — 過去bug（3/15 UTC, 3/30 timezone refactor, 4/21 endDate）
- `packages/sync-engine/test/_property/`
  - `aggregateBinaryLogs.property.test.ts` — commutativity / 冪等性 / 保存則

### 書き方

- `@fast-check/vitest` の `test.prop([...])` を使う
- arbitrary は `packages/domain/test/_property/arbitraries.ts` の共通定義（`isoDateArb` / `dateRangeArb` / `monthBoundaryDateArb` / `dayTargetsArb`）を再利用する
- 失敗時は seed と counterexample が出力される。再現方法は `packages/domain/test/_property/README.md` を参照

### 何を property 化するか

- **不変条件**: 「dailyな合計の和 = 全体合計」「daysActive = endDate - startDate + 1」など、入力にかかわらず常に成り立つ式
- **代数的性質**: commutativity（順序非依存）、associativity、idempotency（冪等）
- **境界の決定論性**: `===` 条件を含む比較（trialEnd vs now など）が境界点で一貫して同じ判定を返す
- **過去 bug**: 修正前のコードでテストが落ちることを確認してから commit する

### 何を property 化しないか

- 単純な例示で十分なロジック（`buildDayTargets({"1": "10"})` など）は通常の unit test で良い
- E2E レベル（DBラウンドトリップを含む）は対象外
- ランダム生成で unit test を全置換しない（unit test が読みやすさで勝る場面は残す）

### Why

- 3/15 doneDate UTC bug は「JST 00:10 でテストする」という人間が思いつかなかった条件で発覚した
- AIエージェントは時刻ロジックの edge case を見落としやすい（タイムゾーン跨ぎ・月末・うるう年）
- property test があれば、エージェントの実装を機械的にガードできる

### 関連: 日付文字列生成パターンの guard

property test で捉えにくい「実装の選択」（`new Date().toISOString().split("T")[0]` 等で UTC 日付を作る）は、`scripts/check-date-rules.js` で禁止している。`pnpm run ci-check` および `post-lint.js` PostToolUse hook で発火する。
- 禁止: `.toISOString().split("T")` / `.toISOString().slice(0, 10)` / `.toLocaleDateString(` / `.toDateString()`
- 代替: `dayjs(...).format("YYYY-MM-DD")` または `packages/frontend-shared/utils/dateUtils.ts` の `getToday()` 等

### How to apply

- 新規ロジック実装時: 例示テスト + property test の両方を追加する
- 既存ロジック修正時: 該当する property test が落ちないことを確認する。落ちる場合は spec の変更がない限り実装を疑う
- bug 修正時: その bug を property 化して `regression.property.test.ts` に追加する

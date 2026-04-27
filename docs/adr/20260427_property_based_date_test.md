# 日時依存ロジックの Property-based Test

## ステータス

決定（2026-04-27）

## コンテキスト

`packages/domain/` および `packages/sync-engine/` の時刻依存ロジックは、例示ベースのユニットテストでは境界条件を網羅しきれず、過去に複数の bug を本番で発覚させてきた。

### 過去の事例

- **3/15 doneDate UTC bug**: `new Date().toISOString().split("T")[0]` が UTC 日付を返すため、JST 00:10 にタスク完了すると `"2026-03-14"` となりユーザーの体感日付（3/15）と1日ずれる。朝のテストでは出ず、深夜実機テストで初めて発覚。
- **3/30 timezone refactor**: JST固定の日付処理をデバイスローカルtimezone対応に切り替え、「クライアントが日付を送る」方針へ転換した。dateUtils 共通化で多数の境界条件が露呈。
- **4/21 endDate boundary**: `endDate < today` のとき `generateDailyRecords` が today まで返してしまう挙動が一部のフロー（authState 初期化）で表面化。

これらに共通するのは「人間が思いつく例示ケース」では発覚せず、特定の時刻・タイムゾーン・月跨ぎ・うるう年といった境界条件で初めて顕在化することだ。

### AIエージェントとの相性

AIエージェントが時刻ロジックを実装するとき、edge case の見落としが頻発する。エージェントは仕様書通りに動く例示を書く一方、「タイムゾーン跨ぎ」「月末・年末」「うるう年」「dayTargets 配列の整合性」のような無数の境界条件を機械的に検査する習慣が弱い。レビューで指摘しても次回また同じ過ちを繰り返すため、**機械的なガードレール**として property test を導入する価値が高い。

## 決定事項

### 採用ライブラリ

- `fast-check@^4.7.0` + `@fast-check/vitest@^0.2.4`
- vitest 2 系との peer 互換のため `@fast-check/vitest` は 0.2 系を選択（0.3+ は vitest 4 を要求）
- 導入先は `@packages/domain` と `@packages/sync-engine`

### ファイル配置

```
packages/domain/test/_property/
  ├── README.md                              … 失敗時の seed 再現方法
  ├── arbitraries.ts                          … 共通 arbitrary（isoDateArb / dateRangeArb / monthBoundaryDateArb / dayTargetsArb）
  ├── example.test.ts                         … サンプル（property test 動作確認）
  ├── goalDayTarget.property.test.ts          … Phase 2: dayTargets / 日数 / 月跨ぎ・年跨ぎ・うるう年・タイムゾーン境界
  ├── activityLog.property.test.ts            … Phase 3: 日次合計の和 / 順序非依存 / JST/UTC帰属の整合
  ├── streakSubscription.property.test.ts     … Phase 5: streak monotonic / gracePeriod境界
  └── regression.property.test.ts             … Phase 6: 過去 bug の回帰固定

packages/sync-engine/test/_property/
  └── aggregateBinaryLogs.property.test.ts    … Phase 4: commutativity / 冪等性 / 保存則
```

### 何を property 化するか

- **不変条件**: 「dailyな合計の和 = 全体合計」「daysActive = endDate - startDate + 1」など、入力にかかわらず常に成り立つ式
- **代数的性質**: commutativity（順序非依存）、idempotency（冪等）、conservation（保存則）
- **境界の決定論性**: `===` 条件を含む比較（trialEnd vs now など）が境界点で一貫した判定を返す
- **過去 bug**: `regression.property.test.ts` に集約。修正前のコードでテストが落ちることを確認してから commit する

### 何を property 化しないか

- 単純な例示で十分なロジックは通常の unit test で良い（unit test が読みやすさで勝る場面は残す）
- E2E レベル（DBラウンドトリップを含む）は対象外
- 全 domain 関数の property 化は目指さない（時刻依存に絞る）

### エージェント運用ルール

`.claude/rules/property-test.md` を新設。「時刻ロジックを書いた時は property test を追加する」を規範化。新規ロジック実装時は例示テスト + property test の両方、bug 修正時はその bug を property 化して `regression.property.test.ts` に追加する。

### 補完: 日付文字列生成パターンの guard

property test は **実行結果の不変条件** を検査するが、`new Date().toISOString().split("T")[0]` のような **実装パターンそのもの** を禁止することはできない。3/15 UTC bug の本質はこの実装選択にあったため、property test と直交する形で多層防御を組む。

- `scripts/check-date-rules.js` で repo 全体を走査し、以下を禁止:
  - `.toISOString().split("T")` / `.toISOString().slice(0, 10)`
  - `.toLocaleDateString(` / `.toDateString()`
- 除外: `scripts/`（dev tooling）/ `e2e/` / `regression.property.test.ts` / ADR・ルール文書
- `pnpm run guard:dates` を `ci-check` にチェーン
- `.claude/hooks/post-lint.js` PostToolUse hook に同検出を追加 → エージェントが編集した瞬間に warning が `additionalContext` で返る
- `new Date()` 自体は禁止しない（タイムスタンプ生成・Date 比較などで広く正当に使われている）。**Date オブジェクトから日付文字列を作るパターンのみ** が対象

代替: `dayjs(...).format("YYYY-MM-DD")` または `packages/frontend-shared/utils/dateUtils.ts` の `getToday()` 等。

### streak 計算の純粋関数化

property test を書く過程で、`calculateGoalStats` が dailyRecords 全体を受け取って average / max / streak を一度に返す形だと streak 単体の property を綺麗に書けないことが判明したため、純粋関数として切り出した。

- `packages/domain/goal/goalStats.ts` に `calculateMaxConsecutiveDays(records)` を新設
  - 内部で日付ソート → 順序非依存を仕様として保証
  - 同一日付の重複は streak を伸ばさない仕様を明示
- `calculateGoalStats` はこれを呼び出す薄いラッパーに変更
- streak property test を順序非依存 / prefix monotonicity / 全0で 0・全1で配列長 / `calculateGoalStats` との整合性まで拡充

## 結果

### 良い影響

- 過去 3 件の bug（3/15 UTC / 3/30 timezone / 4/21 endDate）が回帰検知対象になった
- 日付文字列生成パターンが CI guard と編集時 hook の両方でブロックされる
- streak 計算が純粋関数として切り出され、property の表現力が向上した
- AIエージェントの時刻ロジック実装に対する自動ガードレールが整備された
- 失敗時に fast-check が seed と counterexample を出力するため、再現が容易

### コスト

- CI 実行時間: property test と guard:dates を合わせても全体への影響はほぼ無視できる範囲
- 学習コスト: arbitrary の組み立てに慣れる必要があるが、`arbitraries.ts` で共通化済み

### トレードオフ

- 例示ベースのテストと比べて「失敗時に何が起きたか」の意図伝達が弱い → counterexample をテスト名で表現するスタイルを採用
- ランダム性により稀にしか落ちない bug が混じると flaky に見える → seed 出力で再現性を確保
- guard:dates の禁止パターンは正規表現マッチで、コメント文中の出現は除外しているが完全な AST 解析ではない → 例外は escape hatch ではなく除外ディレクトリ（`scripts/` 等）で対応

## 備考

- `pnpm.overrides` への影響なし（`@fast-check/vitest` は `vitest@^1 || ^2 || ^3 || ^4` を許容）
- vitest を 4 系に上げる際は `@fast-check/vitest` も 0.3+ にバンプする必要がある
- 元 TODO: `docs/todo/property-based-date-test.md`
- 関連ルール: `.claude/rules/property-test.md`
- 関連 guard: `scripts/check-date-rules.js`（package.json `guard:dates`）
- 関連 hook: `.claude/hooks/post-lint.js`（PostToolUse で日付パターン検出）

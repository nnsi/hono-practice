# 日時依存ロジックの Property-based Test

> 対象: `packages/domain/`

## 背景

- 3/15 UTC 日付混同 bug は深夜実機テストで発覚（朝のテストでは出なかった）
- 3/30 timezone リファクタで「クライアントが日付を送る」方針へ転換
- 例示ベースのユニットテストでは日付境界を網羅できない
- AIエージェントが時刻ロジックを書く時、edge case 見落としが頻発する
- Property test があれば、エージェントの実装を境界条件で機械的にガードできる

## ゴール

- 日時境界の bug が CI で早期検知される
- AIエージェントが時刻ロジックを書いた直後、property test がガードレールとして動作する
- 「タイムゾーン跨ぎ」「月跨ぎ」「年跨ぎ」「dayTargets 配列の整合性」の境界が網羅される

## 対象範囲

`packages/domain/` の時刻依存ロジックに集中:

- goal day target 計算（doneDate, dayTargets, targetTotal）
- activity log 集計（日次・週次・月次の境界）
- binary log aggregation
- streak / 連続記録日数
- サブスクリプション期限判定（gracePeriod境界）

---

## Phase 1: 環境整備

- [x] `@fast-check/vitest` を `packages/domain` に導入（root の pnpm.overrides も確認）
- [x] property test の書き方サンプルを `packages/domain/test/_property/example.test.ts` に1本作成
- [x] CI で property test が実行されることを確認（`pnpm run test-once` に含まれるか）
- [x] 失敗時の seed が出力されることを確認、再現方法を README に1行追記

## Phase 2: Goal Day Target

- [x] dayTargets 配列の合計が targetTotal と常に一致する不変条件
- [x] (startDate, endDate) から計算される日数が `endDate - startDate + 1` と常に一致
- [x] dayTargets.length が日数と一致する property
- [x] 月跨ぎ・年跨ぎ・うるう年（2/29）を含む arbitrary を投入
- [x] UTC / JST 境界（深夜0時前後）を含む arbitrary を投入
- [x] doneDate が範囲外の時の挙動が決定論的（throw or null など、仕様明確化）

## Phase 3: Activity Log 集計

- [x] 任意の log 配列で「日次合計の和 = 全体合計」が常に成立
- [x] timezone 切替時（タイムゾーン跨ぎログ）でも集計値が破綻しない
- [x] 同じ瞬間が JST と UTC で異なる日付に帰属するケースで、両方の集計が整合

## Phase 4: Binary Log Aggregation

- [x] aggregateBinaryLogs の結果が入力順序に依存しない（commutativity）
- [x] 集計結果が冪等（同じ入力で何度実行しても同じ）
- [x] 既存の `aggregateBinaryLogs.test.ts` と重複しない property を選定

## Phase 5: Streak / Subscription

- [x] streak: 任意の連続日数列に対し計算結果が monotonic
- [x] streak: 1日でも欠けたら0にリセットされる boundary
- [x] subscription: gracePeriod 境界（前後1秒）で revoke 状態が決定論的
- [x] subscription: タイムゾーンが異なるユーザーで判定が一貫

## Phase 6: 過去 bug の回帰テスト化

- [x] 3/15 UTC bug を property test として追加（git log で正確な事象を特定）
- [x] 3/30 timezone リファクタで露呈した境界を property 化
- [x] 4/21 authState 関連で時刻が絡む箇所があれば追加

---

## 受け入れ条件

- [x] domain 層の主要関数 5 つ以上で property test が動いている
- [x] CI で property test が常時実行され、失敗時に seed が出力される
- [x] 過去の UTC / timezone bug が property test の対象になり、修正前のコードでテストが落ちることを確認
- [x] AIエージェント向けに「時刻ロジックを書いた時は property test を追加する」ルールを `.claude/rules/` に追加

## 非ゴール

- 全 domain 関数の property 化は目指さない（時刻依存に絞る）
- E2E レベルの property test は対象外
- ランダム生成のテストで unit test を全置換しない（unit test が読みやすさで勝る場面は残す）

## 関連

- 既存: `packages/domain/test/`, `aggregateBinaryLogs.test.ts`
- ADR: `docs/adr/20260427_property_based_date_test.md` ✅
- ルール: `.claude/rules/property-test.md` ✅

---

## 完了後の追加対応（2026-04-27）

property test だけでは捉えられない「実装の選択そのもの」をガードするため、以下を追加実装した。

### 日付文字列生成パターンの禁止

property test は実行結果の不変条件を検査するが、`new Date().toISOString().split("T")[0]` のような**実装パターンそのもの**を禁止することはできない。3/15 UTC bug の本質はこの実装選択にあったため、以下で多層防御を構成した。

- [x] `scripts/check-date-rules.js` 新設（repo 全体走査の guard）
  - 禁止: `.toISOString().split("T")` / `.toISOString().slice(0, 10)` / `.toLocaleDateString(` / `.toDateString()`
  - 除外: `scripts/`（dev tooling）/ `e2e/` / `regression.property.test.ts` / ADR・ルール文書
- [x] `package.json` の `guard:dates` を `ci-check` にチェーン
- [x] `.claude/hooks/post-lint.js` PostToolUse hook に同パターン検出を追加（編集即座に warning）
- [x] `.claude/rules/property-test.md` に「関連: 日付文字列生成パターンの guard」セクション追加

`new Date()` 自体は禁止しない方針（タイムスタンプ生成で 84 件正当に使われている）。**Date オブジェクトから日付文字列を作るパターンのみ** が対象。

### streak 計算を純粋関数に切り出し

property test を書く時、`calculateGoalStats` が dailyRecords 全体を受け取って average / max / streak をまとめて返す形だったため、streak 単体の property（順序非依存・prefix monotonicity 等）を綺麗に書けず簡略版で妥協していた。

- [x] `packages/domain/goal/goalStats.ts` に **`calculateMaxConsecutiveDays(records)`** を新設
  - 内部で日付ソート（順序非依存を保証）
  - 同一日付の重複は streak を伸ばさない仕様を明示
- [x] `calculateGoalStats` は `calculateMaxConsecutiveDays` を呼び出す形に変更
- [x] streak property test を **4 件 → 12 件** に強化:
  - 順序非依存（reverse / shuffle）
  - 0 ≤ result ≤ 配列長
  - prefix monotonicity（任意 prefix の streak は元の streak 以下）
  - 全0で 0、全1で配列長
  - 空配列で 0
  - `calculateGoalStats` との整合性

### 残タスク

- `scripts/seedDevData.ts` が 418 行で 200 行ルール超過（既存課題）。分割は別 PR / 別 todo で対応する

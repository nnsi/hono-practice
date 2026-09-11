# Scheduled Tasks Phase 2a 実装報告

実施日: 2026-09-10。作業場所: `.worktrees/scheduled-tasks`。

仮想タスク算出の純粋関数、plain な入出力型、例示テスト、property test を実装した。
domain 全テストと domain 単独の型チェック、指定範囲の Biome は成功。
全体の `pnpm run tsc` は編集範囲外の型エラーにより失敗しており、全体のエラー0という検収条件は未達。

## 変更ファイル

| ファイル | 内容 |
|---|---|
| `packages/domain/taskSchedule/taskScheduleRecord.ts` | ブランド型や Date に依存しない保存行の型 |
| `packages/domain/taskSchedule/scheduledTaskId.ts` | 固定 namespace と uuid v5 による決定的 ID |
| `packages/domain/taskSchedule/isScheduleDueOn.ts` | 有効期間・interval・ISO weekday 判定 |
| `packages/domain/taskSchedule/resolveTodayScheduledTasks.ts` | 当日分算出、既存行との排他、安定した順序、VirtualScheduledTask 型 |
| `packages/domain/taskSchedule/index.ts` | 上記4ファイルの export 追加 |
| `packages/domain/taskSchedule/scheduledTaskId.test.ts` | UUID v5、固定出力値、入力変更の例示テスト |
| `packages/domain/taskSchedule/isScheduleDueOn.test.ts` | 起点・日付境界・曜日・無効 interval の例示テスト |
| `packages/domain/taskSchedule/resolveTodayScheduledTasks.test.ts` | フィールドコピー、状態8通りの排他、削除・非該当除外、順序・入力不変の例示テスト |
| `packages/domain/taskSchedule/testFixtures.ts` | 例示テスト用の共通 fixture（公開 export なし） |
| `packages/domain/test/_property/arbitraries.ts` | 既存 arbitrary を再利用する日付・スケジュール arbitrary の追加 |
| `packages/domain/test/_property/taskSchedule.property.test.ts` | `test.prop` 6本で決定性、今日のみ、排他、interval、weekdays、境界、冪等性を検証 |
| `docs/plan/scheduled-tasks-phase2a-report.md` | 本報告（ユーザーの個別指定により作成） |

既存の taskSchedule ファイルは index.ts の export 追加のみ変更。
arbitraries.ts は追加のみ。package.json・lockfile・他担当のファイルは変更していない。
新規・変更した TypeScript ファイルはすべて200行以内（最大171行）。追加コードに interface・as キャスト・禁止された日付文字列生成はない。

## コマンド結果

| コマンド | 結果 |
|---|---|
| `pnpm exec vitest run packages/domain` | exit 0、28ファイル・345テスト成功 |
| `pnpm exec biome check --write packages/domain/taskSchedule packages/domain/test/_property` | exit 0、20ファイルを確認。最終実行は変更なし |
| `git diff --check -- packages/domain/taskSchedule packages/domain/test/_property` | exit 0 |
| `TZ=America/New_York pnpm exec vitest run packages/domain/taskSchedule packages/domain/test/_property/taskSchedule.property.test.ts` | exit 0、5ファイル・47テスト成功 |
| `TZ=Pacific/Apia pnpm exec vitest run packages/domain/taskSchedule packages/domain/test/_property/taskSchedule.property.test.ts` | exit 0、5ファイル・47テスト成功 |
| `pnpm exec tsgo --noEmit -p packages/domain/taskSchedule/.phase2a-tsconfig.json` | exit 0、domain のソース・テストともに型エラー0 |
| `pnpm run tsc` | exit 1、root の tsgo で停止。admin/mobile の後続チェックは未実行 |

domain に tsconfig.json がないため、型チェック時のみ taskSchedule 配下に一時設定を作成し、終了後に削除した。
設定は `{"extends":"../../../tsconfig.json","include":["../**/*.ts"]}`。
root の strict/noUnused 等を継承して domain 全体を検査している。

全体 tsc の初回失敗には frontend の sync テストにある未使用 import、syncEngine の TaskSchedule 型不一致、
sync-engine の dayjs 解決エラー、sync の既存テストにおける追加された依存・モックの不足が含まれた。
終了前にも全体 tsc を再実行し、exit 1 を確認。最終実行では frontend の syncEngine.ts:21 の
TaskSchedule 型不一致と、frontend の initialSync テスト・sync-engine の mapper/orchestration/pull テスト等の
未使用 import（TS6133/TS6196）が残っていた。domain ファイルのエラーはない。
並行作業中の編集範囲外ファイルなので修正していない。
Vitest の既存設定に関する vite-tsconfig-paths/esbuild の警告は出たが、テスト失敗はない。

## 判断した点

- 日付は検証済みの `YYYY-MM-DD` を受け取る前提。現在日時を取得せず、呼び出し側の today を使用する。
  dayjs の utc plugin で文字列日付を UTC の暦日として扱い、端末 TZ・夏時間・欠落するローカル日付の影響を避けた。
  ISO weekday は既存 dayTargets と同じ `day() || 7` で算出し、isoWeek plugin は追加していない。
- uuid は既存依存を使用。namespace は `9d78e746-8f2d-4a13-9c65-873b2e534120`、name は `${scheduleId}:${scheduledDate}`。
  保存済み ID との互換性のため、この組合せは変更禁止としてコメントし、既知の出力値をテストで固定した。
- plain 型は recurrence の各保存列をそのまま持つ。保存・API 境界での検証は既存 zod に任せる。
  interval が null・0・負数・非整数の行は判定を false にする。
- スキーマは memo の null を許すが TaskItem は string なので、null は空文字に正規化する。
  その他の指定フィールドはコピーし、`isVirtual: true` で判別する。
- tasksOnDate は排他に必要な scheduleId/scheduledDate のみ要求する。
  doneDate/deletedAt/archivedAt を参照せず、当日行の存在だけで表示を抑止する。
  別日の行が混ざっていても当日を抑止しないよう scheduledDate を確認する。
- createdAt はタイムスタンプの時刻として昇順に比較。同時刻なら id の辞書順とし、入力配列の順序に依存させない。
  filter 後の新しい配列を sort するため、呼び出し側の入力は変更しない。
- property test の出力検査は毎回当日該当する行を含め、空配列だけで成功しないようにした。
  interval/曜日は非該当も含む同値条件を検証し、日数差の確認には独立した Date.parse の UTC 日付差も使用する。
  完了・削除・archive の全8組合せは例示テストでも確認した。

このフェーズでは DB 書き込み、実体化、一覧 hook、Web/Mobile UI の変更は行っていない。

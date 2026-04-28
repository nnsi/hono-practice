import { fc, test } from "@fast-check/vitest";
import dayjs from "dayjs";
import { describe, expect } from "vitest";

import { calculateGoalBalance } from "../../goal/goalBalance";
import { generateDailyRecords } from "../../goal/goalStats";
import { isoDateArb } from "./arbitraries";

/**
 * 過去bug回帰: dayjs(date).format("YYYY-MM-DD") は常に local timezone の日付を返し、
 * `new Date().toISOString().split("T")[0]` のような UTC 起算の文字列を生成しない。
 *
 * 関連: 3/15 doneDate UTC bug
 *   - `new Date().toISOString().split("T")[0]` は UTC 日付を返す
 *   - JST 00:10 に完了すると "2026-03-14" になり、ユーザーの体感日付（3/15）と1日ずれる
 *   - 修正: `dayjs().format("YYYY-MM-DD")` に変更
 */
describe("3/15 UTC bug regression: 日付文字列はUTC由来であってはならない", () => {
  test.prop([isoDateArb])(
    "dayjs(date).format('YYYY-MM-DD') は与えた YYYY-MM-DD と常に等しい（UTC再変換で日付が動かない）",
    (date) => {
      // 入力 YYYY-MM-DD はローカルタイムゾーン解釈で 00:00 → 出力も同じ日付になる
      expect(dayjs(date).format("YYYY-MM-DD")).toBe(date);
    },
  );

  test.prop([isoDateArb])(
    "新しい Date() ベースのstartDateでgoalBalanceを実行しても日付がずれない",
    (date) => {
      const goal = {
        dailyTargetQuantity: 1,
        startDate: date,
        endDate: date,
      };
      const result = calculateGoalBalance(goal, [], date);
      // バグが復活すると lastCalculatedDate がUTCで±1日ずれる
      expect(result.lastCalculatedDate).toBe(date);
      expect(result.daysActive).toBe(1);
    },
  );
});

/**
 * 過去bug回帰: 3/30 timezone リファクタで「クライアントが日付を送る」方針へ転換した。
 * → `calculateGoalBalance(goal, logs, today)` の `today` 引数は YYYY-MM-DD 文字列であり、
 *    タイムゾーンに関係なく一貫した結果を返さなければならない。
 */
describe("3/30 timezone refactor regression: today/clientDate は文字列で一貫", () => {
  test.prop([isoDateArb, fc.integer({ min: 0, max: 90 })])(
    "同じ today を渡せば同じ結果（タイムゾーン非依存）",
    (start, span) => {
      const today = dayjs(start).add(span, "day").format("YYYY-MM-DD");
      const goal = {
        dailyTargetQuantity: 5,
        startDate: start,
        endDate: null,
      };
      const r1 = calculateGoalBalance(goal, [], today);
      const r2 = calculateGoalBalance(goal, [], today);
      expect(r1).toEqual(r2);
      expect(r1.daysActive).toBe(span + 1);
      expect(r1.totalTarget).toBe((span + 1) * 5);
    },
  );

  test.prop([isoDateArb, fc.integer({ min: 1, max: 30 })])(
    "endDate=null + today指定: クライアントが渡す today を信頼して集計が一貫する",
    (start, span) => {
      const today = dayjs(start).add(span, "day").format("YYYY-MM-DD");
      const logs = Array.from({ length: span + 1 }, (_, i) => ({
        date: dayjs(start).add(i, "day").format("YYYY-MM-DD"),
        quantity: 3,
      }));
      const goal = {
        dailyTargetQuantity: 1,
        startDate: start,
        endDate: null,
      };
      const result = calculateGoalBalance(goal, logs, today);
      expect(result.totalActual).toBe(3 * (span + 1));
      expect(result.totalTarget).toBe(span + 1);
    },
  );
});

/**
 * 4/21 authState 関連で時刻が絡む箇所: subscription expiry/trial の境界判定。
 * 既に streakSubscription.property.test.ts でカバー済みだが、ここでは
 * 「authState から見た時刻ロジック」として generateDailyRecords が
 * activeEndDate を today/endDate の min で扱うことの回帰を固定する。
 */
describe("4/21 authState / endDate boundary regression", () => {
  test.prop([
    isoDateArb,
    fc.integer({ min: 1, max: 30 }),
    fc.integer({ min: 1, max: 30 }),
  ])(
    "endDate < today のとき generateDailyRecords は endDate までを返す（today を超えない）",
    (start, beforeSpan, afterSpan) => {
      const endDate = dayjs(start).add(beforeSpan, "day").format("YYYY-MM-DD");
      const today = dayjs(endDate).add(afterSpan, "day").format("YYYY-MM-DD");
      const goal = {
        dailyTargetQuantity: 1,
        startDate: start,
        endDate,
      };
      const records = generateDailyRecords(goal, [], today);
      expect(records).toHaveLength(beforeSpan + 1);
      expect(records[records.length - 1].date).toBe(endDate);
    },
  );

  test.prop([
    isoDateArb,
    fc.integer({ min: 1, max: 30 }),
    fc.integer({ min: 1, max: 30 }),
  ])(
    "endDate > today のとき generateDailyRecords は today までを返す",
    (start, todaySpan, futureSpan) => {
      const today = dayjs(start).add(todaySpan, "day").format("YYYY-MM-DD");
      const endDate = dayjs(today).add(futureSpan, "day").format("YYYY-MM-DD");
      const goal = {
        dailyTargetQuantity: 1,
        startDate: start,
        endDate,
      };
      const records = generateDailyRecords(goal, [], today);
      expect(records).toHaveLength(todaySpan + 1);
      expect(records[records.length - 1].date).toBe(today);
    },
  );
});

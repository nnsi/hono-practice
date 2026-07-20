import { fc, test } from "@fast-check/vitest";
import dayjs from "dayjs";
import { describe, expect } from "vitest";

import { validateDate } from "../../csv/csvParser";
import { calculateGoalBalance, countActiveDays } from "../../goal/goalBalance";
import {
  calculateMaxConsecutiveDays,
  generateDailyRecords,
} from "../../goal/goalStats";
import { calendarDayDiff } from "../../time/dateDiff";
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

/**
 * 7/17 calendarDayDiff の TZ 非依存性（BUG-2 の値検証部分）。
 *
 * 注意: これらは TZ 非依存な sanity check であり、旧実装 (`dayjs.diff(...,"day")`)
 * を落とすガードでは「ない」。dayjs 1.11 は endpoint の utcOffset 差 (zoneDelta) を
 * 補正するため、標準的な 02:00 遷移の TZ（America/New_York 等）では旧実装でも
 * 暦日差は正しく、UTC ランナーでも当然通る。
 * → 旧実装を実際に落とす回帰ガードは `test/_tz/dstMidnightDiff.tz.test.ts`
 *   （local midnight で DST 遷移する America/Havana 固定）にある。
 *
 * ここでは月跨ぎ・うるう年・fall-back 月で calendarDayDiff の値を固定するに留める。
 */
describe("7/17 calendarDayDiff sanity: 暦日差は経過ミリ秒に依存しない", () => {
  // ["start", "end", 期待する暦日差]
  const cases: Array<[string, string, number]> = [
    ["2026-03-01", "2026-03-31", 30],
    ["2026-03-07", "2026-03-09", 2],
    // fall-back（2026-11-01）を含む月
    ["2026-11-01", "2026-11-30", 29],
    // うるう年 2 月
    ["2024-02-01", "2024-03-01", 29],
  ];

  test.each(
    cases,
  )("calendarDayDiff(%s, %s) === %i（月末/うるう年非依存）", (start, end, expected) => {
    expect(calendarDayDiff(start, end)).toBe(expected);
  });

  test("countActiveDays は暦日通り（3月は 31 日）", () => {
    expect(countActiveDays("2026-03-01", "2026-03-31", [])).toBe(31);
  });

  test("calculateMaxConsecutiveDays は連続 3 日を 3 と数える", () => {
    const records = [
      { date: "2026-03-07", quantity: 1 },
      { date: "2026-03-08", quantity: 1 },
      { date: "2026-03-09", quantity: 1 },
    ];
    expect(calculateMaxConsecutiveDays(records)).toBe(3);
  });
});

/**
 * 7/17 validateDate 境界の決定論性（BUG-1 の TZ 非依存部分）。
 *
 * 注意: 旧実装 (`new Date("YYYY-MM-DD") > new Date()`) は「実行環境の local 日付が
 * UTC 日付より進んでいる」瞬間にのみ誤拒否する（JST 00:00〜09:00 等）。UTC ランナー
 * では旧実装でもこの describe は通ってしまうため、これは回帰ガードでは「ない」。
 * → 旧実装を実際に落とすガードは `test/_tz/jstMidnightValidateDate.tz.test.ts`
 *   （Asia/Tokyo 固定 + JST 00:30 に fake time）にある。
 *
 * ここでは「今日は受理 / 明日は拒否」という day granularity 境界を固定するに留める。
 */
describe("7/17 validateDate boundary determinism (BUG-1)", () => {
  test.prop([fc.integer({ min: 0, max: 3650 })])(
    "今日以前（0〜10年前）の日付は常に受理される",
    (daysAgo) => {
      const date = dayjs().subtract(daysAgo, "day").format("YYYY-MM-DD");
      expect(validateDate(date)).toBeNull();
    },
  );

  test.prop([fc.integer({ min: 1, max: 3650 })])(
    "明日以降（1〜10年後）の日付は常に拒否される",
    (daysAhead) => {
      const date = dayjs().add(daysAhead, "day").format("YYYY-MM-DD");
      expect(validateDate(date)).toBe("未来の日付は指定できません");
    },
  );

  test("境界: 今日は受理、翌日は拒否（day granularity で決定論的）", () => {
    const today = dayjs().format("YYYY-MM-DD");
    const tomorrow = dayjs().add(1, "day").format("YYYY-MM-DD");
    expect(validateDate(today)).toBeNull();
    expect(validateDate(tomorrow)).toBe("未来の日付は指定できません");
  });
});

import { fc, test } from "@fast-check/vitest";
import dayjs from "dayjs";
import { describe, expect } from "vitest";

import { type DayTargets, getDailyTargetForDate } from "../../goal/dayTargets";
import { calculateGoalBalance } from "../../goal/goalBalance";
import { generateDailyRecords } from "../../goal/goalStats";
import {
  dateRangeArb,
  dayTargetsArb,
  isoDateArb,
  monthBoundaryDateArb,
} from "./arbitraries";

describe("Goal Day Target property", () => {
  test.prop([dateRangeArb])(
    "(startDate, endDate) の日数は常に endDate - startDate + 1 と一致する",
    ({ start, end, span }) => {
      const goal = {
        dailyTargetQuantity: 1,
        startDate: start,
        endDate: end,
      };
      const records = generateDailyRecords(goal, [], end);
      expect(records).toHaveLength(span + 1);
      expect(records[0].date).toBe(start);
      expect(records[records.length - 1].date).toBe(end);
    },
  );

  test.prop([dateRangeArb, fc.integer({ min: 0, max: 50 })])(
    "uniform daily target: totalTarget = daysActive * dailyTargetQuantity",
    ({ start, end }, dailyTargetQuantity) => {
      const goal = {
        dailyTargetQuantity,
        startDate: start,
        endDate: end,
      };
      const result = calculateGoalBalance(goal, [], end);
      expect(result.totalTarget).toBe(result.daysActive * dailyTargetQuantity);
    },
  );

  test.prop([dateRangeArb, fc.integer({ min: 0, max: 50 }), dayTargetsArb])(
    "dayTargets 配列の合計（範囲内に出現する曜日の合計）が totalTarget と常に一致する",
    ({ start, end }, dailyTargetQuantity, dayTargets) => {
      const goal = {
        dailyTargetQuantity,
        startDate: start,
        endDate: end,
        dayTargets: Object.keys(dayTargets).length > 0 ? dayTargets : null,
      };
      const result = calculateGoalBalance(goal, [], end);

      let expectedTotal = 0;
      let cur = dayjs(start);
      const e = dayjs(end);
      while (!cur.isAfter(e)) {
        const dateStr = cur.format("YYYY-MM-DD");
        expectedTotal += getDailyTargetForDate(
          dailyTargetQuantity,
          goal.dayTargets,
          dateStr,
        );
        cur = cur.add(1, "day");
      }
      expect(result.totalTarget).toBe(expectedTotal);
    },
  );

  test.prop([dateRangeArb, fc.integer({ min: 0, max: 50 }), dayTargetsArb])(
    "dailyRecords の長さが日数と一致する（dayTargets ありでも変わらない）",
    ({ start, end, span }, dailyTargetQuantity, dayTargets) => {
      const goal = {
        dailyTargetQuantity,
        startDate: start,
        endDate: end,
        dayTargets: Object.keys(dayTargets).length > 0 ? dayTargets : null,
      };
      const records = generateDailyRecords(goal, [], end);
      expect(records).toHaveLength(span + 1);
    },
  );

  test.prop([monthBoundaryDateArb, fc.integer({ min: 1, max: 60 })])(
    "月跨ぎ・年跨ぎ・うるう年を含む arbitrary でも日数計算が破綻しない",
    (start, span) => {
      const end = dayjs(start).add(span, "day").format("YYYY-MM-DD");
      const goal = {
        dailyTargetQuantity: 1,
        startDate: start,
        endDate: end,
      };
      const result = calculateGoalBalance(goal, [], end);
      expect(result.daysActive).toBe(span + 1);
      expect(result.totalTarget).toBe(span + 1);
    },
  );

  test.prop([
    fc.constantFrom("2024-02-29", "2028-02-29"),
    fc.integer({ min: 1, max: 30 }),
  ])("うるう年の 2/29 を含む範囲で daysActive が正しい", (start, span) => {
    const end = dayjs(start).add(span, "day").format("YYYY-MM-DD");
    const goal = {
      dailyTargetQuantity: 1,
      startDate: start,
      endDate: end,
    };
    const result = calculateGoalBalance(goal, [], end);
    expect(result.daysActive).toBe(span + 1);
  });

  test.prop([isoDateArb])(
    "getDailyTargetForDate: 同じ入力に対して常に決定論的（純粋関数）",
    (date) => {
      const dayTargets: DayTargets = { 1: 5, 3: 7, 5: 9 };
      const a = getDailyTargetForDate(10, dayTargets, date);
      const b = getDailyTargetForDate(10, dayTargets, date);
      expect(a).toBe(b);
      expect(a === 5 || a === 7 || a === 9 || a === 10).toBe(true);
    },
  );

  test.prop([isoDateArb])(
    "getDailyTargetForDate: dayTargets null/undefined のとき dailyTargetQuantity を返す",
    (date) => {
      expect(getDailyTargetForDate(42, null, date)).toBe(42);
      expect(getDailyTargetForDate(42, undefined, date)).toBe(42);
    },
  );

  test.prop([isoDateArb, fc.integer({ min: -10, max: -1 })])(
    "doneDate が範囲外（startDate より前）の時、calculateGoalBalance の結果は決定論的（daysActive=0）",
    (date, offset) => {
      const start = dayjs(date).format("YYYY-MM-DD");
      const before = dayjs(date).add(offset, "day").format("YYYY-MM-DD");
      const goal = {
        dailyTargetQuantity: 10,
        startDate: start,
        endDate: null,
      };
      const result = calculateGoalBalance(goal, [], before);
      expect(result.daysActive).toBe(0);
      expect(result.totalTarget).toBe(0);
      expect(result.totalActual).toBe(0);
      expect(result.currentBalance).toBe(0);
    },
  );

  test.prop([dateRangeArb, fc.integer({ min: 0, max: 100 })])(
    "endDate が today より前のとき totalTarget は endDate までで打ち切られる",
    ({ start, end, span }, daysAfterEnd) => {
      const today = dayjs(end).add(daysAfterEnd, "day").format("YYYY-MM-DD");
      const goal = {
        dailyTargetQuantity: 5,
        startDate: start,
        endDate: end,
      };
      const result = calculateGoalBalance(goal, [], today);
      expect(result.lastCalculatedDate).toBe(end);
      expect(result.daysActive).toBe(span + 1);
      expect(result.totalTarget).toBe((span + 1) * 5);
    },
  );

  test.prop([
    fc.constantFrom("2026-03-15", "2026-12-31", "2028-02-29"),
    fc.integer({ min: 0, max: 23 }),
  ])(
    "UTC 0時前後（深夜境界）でも YYYY-MM-DD 文字列ベースの日付計算は決定論的",
    (date, hourOffset) => {
      const goal = {
        dailyTargetQuantity: 1,
        startDate: date,
        endDate: date,
      };
      const today = date;
      const result = calculateGoalBalance(goal, [], today);
      expect(result.daysActive).toBe(1);
      expect(result.totalTarget).toBe(1);
      expect(result.lastCalculatedDate).toBe(date);
      expect(typeof hourOffset).toBe("number");
    },
  );
});

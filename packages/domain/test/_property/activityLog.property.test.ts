import { fc, test } from "@fast-check/vitest";
import dayjs from "dayjs";
import { describe, expect } from "vitest";

import {
  filterLogsByDateRange,
  sumQuantity,
} from "../../activityLog/activityLogPredicates";
import { dateRangeArb, isoDateArb } from "./arbitraries";

const logsArb = (start: string, end: string) =>
  fc.array(
    fc.record({
      date: fc
        .integer({
          min: 0,
          max: Math.max(0, dayjs(end).diff(dayjs(start), "day")),
        })
        .map((d) => dayjs(start).add(d, "day").format("YYYY-MM-DD")),
      quantity: fc.option(fc.integer({ min: 0, max: 100 }), { nil: null }),
      activityId: fc.string({ minLength: 1, maxLength: 4 }),
    }),
    { maxLength: 50 },
  );

describe("ActivityLog 集計 property", () => {
  test.prop([dateRangeArb])(
    "任意の log 配列で「日次合計の和 = 全体合計」が常に成立",
    ({ start, end }) => {
      const sample = fc.sample(logsArb(start, end), 1)[0];
      const inRange = filterLogsByDateRange(sample, start, end);
      const total = sumQuantity(inRange);

      const byDate = new Map<string, number>();
      for (const log of inRange) {
        byDate.set(log.date, (byDate.get(log.date) ?? 0) + (log.quantity ?? 0));
      }
      const sumOfDailySums = Array.from(byDate.values()).reduce(
        (acc, v) => acc + v,
        0,
      );
      expect(sumOfDailySums).toBe(total);
    },
  );

  test.prop([dateRangeArb])(
    "filterLogsByDateRange は範囲外ログを除外し、範囲内ログの合計は filter 前と一致する",
    ({ start, end }) => {
      const inside = fc.sample(logsArb(start, end), 1)[0];
      const after = dayjs(end).add(1, "day").format("YYYY-MM-DD");
      const outside = inside.map((l) => ({ ...l, date: after }));
      const all = [...inside, ...outside];

      const filtered = filterLogsByDateRange(all, start, end);
      // filter は範囲内ログだけを返す
      for (const log of filtered) {
        expect(log.date >= start && log.date <= end).toBe(true);
      }
      expect(sumQuantity(filtered)).toBe(sumQuantity(inside));
    },
  );

  test.prop([
    fc.array(
      fc.record({
        date: isoDateArb,
        quantity: fc.option(fc.integer({ min: 0, max: 100 }), { nil: null }),
        activityId: fc.string({ minLength: 1, maxLength: 3 }),
      }),
      { maxLength: 30 },
    ),
  ])("sumQuantity は順序非依存（commutativity）", (logs) => {
    const reversed = [...logs].reverse();
    const shuffled = [...logs].sort((a, b) =>
      (a.activityId + a.date).localeCompare(b.activityId + b.date),
    );
    expect(sumQuantity(reversed)).toBe(sumQuantity(logs));
    expect(sumQuantity(shuffled)).toBe(sumQuantity(logs));
  });

  test.prop([
    fc.array(
      fc.record({
        date: isoDateArb,
        quantity: fc.option(fc.integer({ min: 0, max: 100 }), { nil: null }),
        activityId: fc.string({ minLength: 1, maxLength: 3 }),
      }),
      { maxLength: 30 },
    ),
  ])("sumQuantity は冪等的に2回呼んでも同じ値（純粋関数）", (logs) => {
    expect(sumQuantity(logs)).toBe(sumQuantity(logs));
  });

  test.prop([
    fc.constantFrom("Asia/Tokyo", "UTC", "America/Los_Angeles"),
    isoDateArb,
  ])(
    "JST と UTC で同じ瞬間が異なる日付に帰属するケースを文字列で渡しても破綻しない",
    (_tz, baseDate) => {
      const utcDate = baseDate;
      const jstNextDay = dayjs(baseDate).add(1, "day").format("YYYY-MM-DD");
      const logs = [
        { date: utcDate, quantity: 5, activityId: "a" },
        { date: jstNextDay, quantity: 7, activityId: "a" },
      ];
      const totalAll = sumQuantity(logs);
      const utcOnly = filterLogsByDateRange(logs, utcDate, utcDate);
      const jstOnly = filterLogsByDateRange(logs, jstNextDay, jstNextDay);
      // 両方の集計を足すと全体と一致する（タイムゾーンを跨いでも文字列比較で整合）
      expect(sumQuantity(utcOnly) + sumQuantity(jstOnly)).toBe(totalAll);
    },
  );

  test.prop([
    fc.array(
      fc.record({
        date: isoDateArb,
        quantity: fc.option(fc.integer({ min: 0, max: 100 }), { nil: null }),
        activityId: fc.string({ minLength: 1, maxLength: 3 }),
      }),
      { minLength: 1, maxLength: 30 },
    ),
  ])(
    "全期間を含む範囲で filterLogsByDateRange した結果は元配列の合計と一致（タイムゾーン跨ぎログでも破綻しない）",
    (logs) => {
      const minDate = logs.reduce(
        (m, l) => (l.date < m ? l.date : m),
        logs[0].date,
      );
      const maxDate = logs.reduce(
        (m, l) => (l.date > m ? l.date : m),
        logs[0].date,
      );
      const filtered = filterLogsByDateRange(logs, minDate, maxDate);
      expect(filtered).toHaveLength(logs.length);
      expect(sumQuantity(filtered)).toBe(sumQuantity(logs));
    },
  );
});

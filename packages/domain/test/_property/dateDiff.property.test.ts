import { fc, test } from "@fast-check/vitest";
import dayjs from "dayjs";
import { describe, expect } from "vitest";

import { countActiveDays } from "../../goal/goalBalance";
import { calendarDayDiff } from "../../time/dateDiff";
import { dateRangeArb, isoDateArb } from "./arbitraries";

/**
 * BUG-2: DST 非安全な日数計算の回帰ガード。
 *
 * `dayjs(a).diff(b, "day")` は経過ミリ秒 ÷ 86,400,000 の切り捨てのため、
 * DST を跨ぐ期間で 1 日過少になる。calendarDayDiff は UTC 深夜正規化で
 * 暦日差を常に整数で返す。
 *
 * 不変条件: calendarDayDiff(start, end) は「start から .add(1,"day") で
 * end まで進めたイテレーション回数」と常に一致する（.add(1,"day") は
 * カレンダー安全なので基準にできる）。
 */

/** start から end まで .add(1,"day") で進めるのに要するステップ数 */
function iterateDayCount(start: string, end: string): number {
  let count = 0;
  let cur = dayjs(start);
  const e = dayjs(end);
  while (cur.isBefore(e)) {
    cur = cur.add(1, "day");
    count++;
  }
  return count;
}

describe("calendarDayDiff: 暦日差はイテレーション回数と一致する", () => {
  test.prop([dateRangeArb])(
    "calendarDayDiff(start, end) === add(1,'day') のステップ数（= span）",
    ({ start, end, span }) => {
      expect(calendarDayDiff(start, end)).toBe(iterateDayCount(start, end));
      expect(calendarDayDiff(start, end)).toBe(span);
    },
  );

  test.prop([dateRangeArb])(
    "countActiveDays(start, end, []) === 包含日数（イテレーション日数 + 1）",
    ({ start, end }) => {
      expect(countActiveDays(start, end, [])).toBe(
        iterateDayCount(start, end) + 1,
      );
    },
  );

  test.prop([isoDateArb])("同一日の差は 0（反射律）", (date) => {
    expect(calendarDayDiff(date, date)).toBe(0);
  });

  test.prop([dateRangeArb])("逆順は符号反転（反対称律）", ({ start, end }) => {
    // `|| 0` は span=0 のときの -0 を +0 に正規化する（Object.is 対策）
    expect(calendarDayDiff(end, start)).toBe(-calendarDayDiff(start, end) || 0);
  });

  test.prop([isoDateArb, fc.integer({ min: 0, max: 800 })])(
    "3区間の加法性: diff(a,c) === diff(a,b) + diff(b,c)",
    (start, span) => {
      const mid = dayjs(start)
        .add(Math.floor(span / 2), "day")
        .format("YYYY-MM-DD");
      const end = dayjs(start).add(span, "day").format("YYYY-MM-DD");
      expect(calendarDayDiff(start, end)).toBe(
        calendarDayDiff(start, mid) + calendarDayDiff(mid, end),
      );
    },
  );
});

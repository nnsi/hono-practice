import { fc, test } from "@fast-check/vitest";
import dayjs from "dayjs";
import { describe, expect } from "vitest";

import {
  calculateGoalStats,
  calculateMaxConsecutiveDays,
  generateDailyRecords,
} from "../../goal/goalStats";
import {
  isSubscriptionActive,
  isSubscriptionInTrial,
} from "../../subscription/subscriptionSchema";
import { isoDateArb } from "./arbitraries";

describe("calculateMaxConsecutiveDays (pure) property", () => {
  test.prop([isoDateArb, fc.integer({ min: 1, max: 60 })])(
    "全日 quantity>0 の連続列の最長連続は配列長と一致する",
    (start, span) => {
      const records = Array.from({ length: span }, (_, i) => ({
        date: dayjs(start).add(i, "day").format("YYYY-MM-DD"),
        quantity: 1,
      }));
      expect(calculateMaxConsecutiveDays(records)).toBe(span);
    },
  );

  test.prop([isoDateArb, fc.integer({ min: 1, max: 60 })])(
    "順序非依存: シャッフルしても結果は同じ（内部で日付ソートされる）",
    (start, span) => {
      const records = Array.from({ length: span }, (_, i) => ({
        date: dayjs(start).add(i, "day").format("YYYY-MM-DD"),
        quantity: 1,
      }));
      const reversed = [...records].reverse();
      const shuffled = [...records].sort(() => 0.5 - Math.random());
      expect(calculateMaxConsecutiveDays(reversed)).toBe(
        calculateMaxConsecutiveDays(records),
      );
      expect(calculateMaxConsecutiveDays(shuffled)).toBe(
        calculateMaxConsecutiveDays(records),
      );
    },
  );

  test.prop([isoDateArb, fc.integer({ min: 3, max: 60 })])(
    "1日欠ければ左右の長い方が答え（gap で打ち切り）",
    (start, span) => {
      const gapIndex = Math.floor(span / 2);
      const records = Array.from({ length: span }, (_, i) => ({
        date: dayjs(start).add(i, "day").format("YYYY-MM-DD"),
        quantity: i === gapIndex ? 0 : 1,
      }));
      const left = gapIndex;
      const right = span - gapIndex - 1;
      expect(calculateMaxConsecutiveDays(records)).toBe(Math.max(left, right));
    },
  );

  test.prop([fc.array(fc.constantFrom(0, 1, 5, 10), { maxLength: 100 })])(
    "任意の quantity 列に対し 0 <= maxStreak <= 配列長",
    (quantities) => {
      const records = quantities.map((q, i) => ({
        date: dayjs("2026-01-01").add(i, "day").format("YYYY-MM-DD"),
        quantity: q,
      }));
      const r = calculateMaxConsecutiveDays(records);
      expect(r).toBeGreaterThanOrEqual(0);
      expect(r).toBeLessThanOrEqual(records.length);
    },
  );

  test.prop([fc.array(fc.constantFrom(0, 1, 5), { maxLength: 100 })])(
    "monotonic prefix: prefix の streak は元配列の streak 以下",
    (quantities) => {
      const records = quantities.map((q, i) => ({
        date: dayjs("2026-01-01").add(i, "day").format("YYYY-MM-DD"),
        quantity: q,
      }));
      const fullStreak = calculateMaxConsecutiveDays(records);
      for (let n = 0; n <= records.length; n++) {
        const prefix = records.slice(0, n);
        expect(calculateMaxConsecutiveDays(prefix)).toBeLessThanOrEqual(
          fullStreak,
        );
      }
    },
  );

  test.prop([fc.array(fc.constantFrom(0, 1), { maxLength: 50 })])(
    "全0なら 0、全1なら配列長と一致",
    (quantities) => {
      const records = quantities.map((q, i) => ({
        date: dayjs("2026-01-01").add(i, "day").format("YYYY-MM-DD"),
        quantity: q,
      }));
      const r = calculateMaxConsecutiveDays(records);
      if (records.every((x) => x.quantity === 0)) expect(r).toBe(0);
      if (records.length > 0 && records.every((x) => x.quantity > 0))
        expect(r).toBe(records.length);
    },
  );

  test("空配列は 0", () => {
    expect(calculateMaxConsecutiveDays([])).toBe(0);
  });

  test("calculateGoalStats との整合: dailyRecords を渡すと同じ値を返す", () => {
    const goal = {
      dailyTargetQuantity: 1,
      startDate: "2026-01-01",
      endDate: "2026-01-10",
    };
    const logs = [
      { date: "2026-01-01", quantity: 1 },
      { date: "2026-01-02", quantity: 1 },
      { date: "2026-01-03", quantity: 0 },
      { date: "2026-01-04", quantity: 1 },
      { date: "2026-01-05", quantity: 1 },
      { date: "2026-01-06", quantity: 1 },
    ];
    const records = generateDailyRecords(goal, logs, "2026-01-10");
    const stats = calculateGoalStats(records);
    expect(stats.maxConsecutiveDays).toBe(calculateMaxConsecutiveDays(records));
    expect(stats.maxConsecutiveDays).toBe(3); // 1/4-1/6
  });
});

describe("subscription gracePeriod boundary property", () => {
  test.prop([
    fc.date({
      min: new Date("2026-01-01T00:00:00Z"),
      max: new Date("2026-12-31T23:59:59Z"),
      noInvalidDate: true,
    }),
    fc.integer({ min: -3, max: 3 }),
  ])(
    "trial: trialEnd 前後1秒で active 状態が決定論的（境界 = trialEnd 自身は inactive）",
    (trialEnd, secondsOffset) => {
      const sub = {
        status: "trial" as const,
        trialEnd,
      };
      const now = new Date(trialEnd.getTime() + secondsOffset * 1000);
      const active = isSubscriptionActive(sub, now);
      const inTrial = isSubscriptionInTrial(sub, now);
      // 仕様: now < trialEnd で active
      const expected = now < trialEnd;
      expect(active).toBe(expected);
      expect(inTrial).toBe(expected);
    },
  );

  test.prop([
    fc.date({
      min: new Date("2026-01-01T00:00:00Z"),
      max: new Date("2026-12-31T23:59:59Z"),
      noInvalidDate: true,
    }),
    fc.constantFrom("active", "paused", "cancelled", "expired"),
  ])(
    "non-trial の status のうち active のみが isSubscriptionActive=true",
    (now, status) => {
      const sub = { status: status as "active", trialEnd: null };
      expect(isSubscriptionActive(sub, now)).toBe(status === "active");
      expect(isSubscriptionInTrial(sub, now)).toBe(false);
    },
  );

  test.prop([
    fc.date({
      min: new Date("2026-01-01T00:00:00Z"),
      max: new Date("2026-12-31T23:59:59Z"),
      noInvalidDate: true,
    }),
    fc.integer({ min: -86400, max: 86400 }),
  ])(
    "タイムゾーンが異なるユーザー（now を ±1日ずらしても）でも判定が決定論的",
    (trialEnd, secondsOffset) => {
      const sub = { status: "trial" as const, trialEnd };
      const now = new Date(trialEnd.getTime() + secondsOffset * 1000);
      const a = isSubscriptionActive(sub, now);
      const b = isSubscriptionActive(sub, now);
      expect(a).toBe(b);
      // 境界で唯一 true→false が切り替わる点は trialEnd
      if (secondsOffset < 0) expect(a).toBe(true);
      if (secondsOffset > 0) expect(a).toBe(false);
    },
  );

  test.prop([
    fc.date({
      min: new Date("2026-01-01T00:00:00Z"),
      max: new Date("2026-12-31T23:59:59Z"),
      noInvalidDate: true,
    }),
  ])("trialEnd === now のときは inactive（境界の決定論性）", (boundary) => {
    const sub = { status: "trial" as const, trialEnd: boundary };
    expect(isSubscriptionActive(sub, boundary)).toBe(false);
  });
});

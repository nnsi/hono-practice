import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { validateDate } from "../../csv/csvParser";

/**
 * このスイートは Asia/Tokyo 下でのみ意味を持つ。TZ は vitest.config.ts の専用
 * project (`tz-tokyo`, pool: forks, env.TZ) で固定される。
 *
 * BUG-1 の本質: 旧 validateDate は `new Date("YYYY-MM-DD")`(UTC 深夜) を
 * `new Date()`(ローカル現在時刻) と比較していた。JST 00:30 の時点で UTC 日付は
 * まだ「昨日」なので、「今日」(JST) の CSV 行が「未来の日付」で誤拒否されていた。
 * → dayjs の day granularity 比較で解消。
 *
 * fake timer で now を JST 2025-06-15 00:30 (= 2025-06-14T15:30:00Z) に固定する。
 * この条件は UTC ランナーでは「今日」にならず旧実装も通ってしまうため、
 * Asia/Tokyo 固定が旧コードを実際に落とす唯一のガードになる。
 */
describe("validateDate at JST early morning (Asia/Tokyo)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // 2025-06-15 00:30 JST === 2025-06-14T15:30:00Z
    vi.setSystemTime(new Date("2025-06-14T15:30:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("今日(JST) の日付を受理する（旧実装は『未来の日付』で誤拒否）", () => {
    expect(validateDate("2025-06-15")).toBeNull();
  });

  it("昨日(JST) の日付を受理する", () => {
    expect(validateDate("2025-06-14")).toBeNull();
  });

  it("明日(JST) の日付は拒否する（境界の決定論性）", () => {
    expect(validateDate("2025-06-16")).toBe("未来の日付は指定できません");
  });
});

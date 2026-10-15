import { describe, expect, it } from "vitest";

import { validateActivityLogDate } from "./activityLogValidation";

// v1 の domain factory と v2 sync の両方が使う 10 年境界の例示テスト。
// `new Date("YYYY-MM-DD")` は UTC 0 時、`now` 側は setFullYear によるローカル時刻の
// 比較になるため、境界ちょうどではなく前後 1 日で確認する。
describe("validateActivityLogDate", () => {
  const now = new Date("2026-03-01T12:00:00.000Z");

  it("10 年前の翌日以降は受理する", () => {
    expect(() => validateActivityLogDate("2016-03-02", now)).not.toThrow();
    expect(() => validateActivityLogDate("2026-03-01", now)).not.toThrow();
  });

  it("10 年より前は拒否する", () => {
    expect(() => validateActivityLogDate("2016-02-28", now)).toThrow(
      "date is too old",
    );
    expect(() => validateActivityLogDate("2000-01-01", now)).toThrow();
  });

  it("未来日は範囲検証の対象外 (v1 と同じ挙動)", () => {
    expect(() => validateActivityLogDate("2099-12-31", now)).not.toThrow();
  });

  it("now がうるう日のときは 3/1 に繰り上がった境界で判定する", () => {
    const leap = new Date("2036-02-29T12:00:00.000Z");
    // 2036-02-29 の 10 年前は存在しないため setFullYear は 2026-03-01 になる
    expect(() => validateActivityLogDate("2026-03-02", leap)).not.toThrow();
    expect(() => validateActivityLogDate("2026-02-28", leap)).toThrow();
  });
});

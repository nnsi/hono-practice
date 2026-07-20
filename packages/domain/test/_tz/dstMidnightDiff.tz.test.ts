import { describe, expect, it } from "vitest";

import { countActiveDays } from "../../goal/goalBalance";
import { calculateMaxConsecutiveDays } from "../../goal/goalStats";

/**
 * このスイートは DST 遷移が local midnight (00:00→01:00) で起きるタイムゾーン
 * (America/Havana) 下でのみ意味を持つ。TZ は vitest.config.ts の専用 project
 * (`tz-havana`, pool: forks, env.TZ) で固定される（forks なので他 project の
 * threads プールへ TZ が漏れない）。
 *
 * BUG-2 の本質: `dayjs(end).diff(dayjs(start), "day")` は midnight-DST を跨ぐと
 * 暦日差を 1 日過少に返す。2021-03-14 は Havana の spring-forward が local
 * midnight で起きる日で、存在しない 00:00 が 01:00 に丸められるため
 * `dayjs("2021-03-15").diff(dayjs("2021-03-14"), "day")` が 0 になる。
 * → countActiveDays は 1 過少、streak は途切れる。
 * calendarDayDiff は UTC 深夜正規化で TZ/DST 非依存に正しい暦日差を返す。
 *
 * （UTC ランナーでは旧実装でも通ってしまうため、この TZ 固定が旧コードを
 *  実際に落とす唯一のガードになる。標準的な 02:00 遷移の TZ では dayjs 1.11 が
 *  zoneDelta 補正するので旧実装でも正しく、落ちない。）
 */
const BEFORE = "2021-03-14";
const AFTER = "2021-03-15";

describe("DST midnight transition (America/Havana): 暦日差は TZ 非依存", () => {
  it("countActiveDays は midnight-DST 跨ぎでも 2 日を返す（旧実装は 1）", () => {
    expect(countActiveDays(BEFORE, AFTER, [])).toBe(2);
  });

  it("calculateMaxConsecutiveDays は midnight-DST 跨ぎで連続を保つ（旧実装は 1）", () => {
    const records = [
      { date: BEFORE, quantity: 1 },
      { date: AFTER, quantity: 1 },
    ];
    expect(calculateMaxConsecutiveDays(records)).toBe(2);
  });
});

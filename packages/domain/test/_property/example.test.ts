import { fc, test } from "@fast-check/vitest";
import dayjs from "dayjs";
import { describe, expect } from "vitest";

import { isoDateArb } from "./arbitraries";

describe("property test sample (smoke)", () => {
  test.prop([isoDateArb, fc.integer({ min: 0, max: 365 })])(
    "dayjs(date).add(n, 'day') 後の日数差は常に n と一致する",
    (date, n) => {
      const start = dayjs(date);
      const end = start.add(n, "day");
      expect(end.diff(start, "day")).toBe(n);
    },
  );

  test.prop([
    fc.integer({ min: 0, max: 100 }),
    fc.integer({ min: 0, max: 100 }),
  ])("整数加算は可換である（property test の動作確認）", (a, b) => {
    expect(a + b).toBe(b + a);
  });
});

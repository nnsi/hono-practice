import { describe, expect, it } from "vitest";
import { formatQuantityWithUnit } from "./formatUtils";

describe("formatQuantityWithUnit", () => {
  describe('単位が "時間" の場合', () => {
    it("0.5 → 30分", () => {
      expect(formatQuantityWithUnit(0.5, "時間")).toBe("30分");
    });

    it("1 → 1時間", () => {
      expect(formatQuantityWithUnit(1, "時間")).toBe("1時間");
    });

    it("1.5 → 1時間30分", () => {
      expect(formatQuantityWithUnit(1.5, "時間")).toBe("1時間30分");
    });

    it("2.75 → 2時間45分", () => {
      expect(formatQuantityWithUnit(2.75, "時間")).toBe("2時間45分");
    });

    it("0 → 0分", () => {
      expect(formatQuantityWithUnit(0, "時間")).toBe("0分");
    });

    it("0.25 → 15分", () => {
      expect(formatQuantityWithUnit(0.25, "時間")).toBe("15分");
    });

    it("10 → 10時間", () => {
      expect(formatQuantityWithUnit(10, "時間")).toBe("10時間");
    });

    it("24 → 24時間", () => {
      expect(formatQuantityWithUnit(24, "時間")).toBe("24時間");
    });
  });

  describe('単位が "hour" の場合', () => {
    it("0.5 → 30分", () => {
      expect(formatQuantityWithUnit(0.5, "hour")).toBe("30分");
    });

    it("1 → 1時間", () => {
      expect(formatQuantityWithUnit(1, "hour")).toBe("1時間");
    });

    it("1.5 → 1時間30分", () => {
      expect(formatQuantityWithUnit(1.5, "hour")).toBe("1時間30分");
    });
  });

  describe('単位が "hours" の場合', () => {
    it("2 → 2時間", () => {
      expect(formatQuantityWithUnit(2, "hours")).toBe("2時間");
    });

    it("0.5 → 30分", () => {
      expect(formatQuantityWithUnit(0.5, "hours")).toBe("30分");
    });
  });

  describe("境界値・エッジケース", () => {
    it("1.999 → Math.roundにより1時間60分になる（実装の既知の制限: 60分→時間の正規化なし）", () => {
      // (1.999 - 1) * 60 = 59.94 → Math.round → 60
      // hours=1, minutes=60 → "1時間60分" が返る
      // NOTE: 実装側で minutes===60 のケースを hours+1, minutes=0 に正規化すれば "2時間" になる
      expect(formatQuantityWithUnit(1.999, "時間")).toBe("1時間60分");
    });

    it("1.99 → 1時間59分", () => {
      // (1.99 - 1) * 60 = 59.4 → Math.round → 59
      expect(formatQuantityWithUnit(1.99, "時間")).toBe("1時間59分");
    });

    it("負の値", () => {
      // Math.floor(-0.5) = -1, Math.round((-0.5 - (-1)) * 60) = Math.round(30) = 30
      expect(formatQuantityWithUnit(-0.5, "時間")).toBe("-1時間30分");
    });

    it("NaN → NaN表記になる", () => {
      const result = formatQuantityWithUnit(NaN, "回");
      expect(result).toBe("NaN回");
    });

    it("Infinity → Infinity表記になる", () => {
      const result = formatQuantityWithUnit(Infinity, "時間");
      // Math.floor(Infinity) = Infinity, Math.round(NaN) = NaN
      expect(result).toContain("Infinity");
    });

    it("非常に小さい小数", () => {
      expect(formatQuantityWithUnit(0.01, "時間")).toBe("1分");
    });
  });

  describe("一般的な単位の場合", () => {
    it('5回 → "5回"', () => {
      expect(formatQuantityWithUnit(5, "回")).toBe("5回");
    });

    it('3.14km → "3.14km"', () => {
      expect(formatQuantityWithUnit(3.14, "km")).toBe("3.14km");
    });

    it('100kcal → "100kcal"', () => {
      expect(formatQuantityWithUnit(100, "kcal")).toBe("100kcal");
    });

    it("小数点以下2桁に丸める", () => {
      expect(formatQuantityWithUnit(3.14159, "km")).toBe("3.14km");
    });

    it("0の場合", () => {
      expect(formatQuantityWithUnit(0, "回")).toBe("0回");
    });

    it("大きな数値はロケール形式でフォーマットされる", () => {
      const result = formatQuantityWithUnit(1234567, "歩");
      // toLocaleStringの結果はロケールに依存するが、数値部分を含むことを確認
      expect(result).toContain("歩");
      expect(result.length).toBeGreaterThan(2);
    });
  });
});

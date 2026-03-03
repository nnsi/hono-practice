import { describe, expect, it } from "vitest";

import { formatQuantityWithUnit, roundQuantity } from "./statsFormatting";

describe("roundQuantity", () => {
  it("小数点第1位で四捨五入する", () => {
    expect(roundQuantity(1.94)).toBe(1.9);
    expect(roundQuantity(1.95)).toBe(2);
    expect(roundQuantity(1.99999)).toBe(2);
    expect(roundQuantity(Math.PI)).toBe(3.1);
  });

  it("整数はそのまま返す", () => {
    expect(roundQuantity(5)).toBe(5);
    expect(roundQuantity(0)).toBe(0);
  });

  it("浮動小数点の加算誤差を吸収する", () => {
    // 0.1 + 0.2 = 0.30000000000000004
    expect(roundQuantity(0.1 + 0.2)).toBe(0.3);
  });
});

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

  describe('単位が "分" の場合', () => {
    it("30 → 30分", () => {
      expect(formatQuantityWithUnit(30, "分")).toBe("30分");
    });

    it("60 → 1時間", () => {
      expect(formatQuantityWithUnit(60, "分")).toBe("1時間");
    });

    it("90 → 1時間30分", () => {
      expect(formatQuantityWithUnit(90, "分")).toBe("1時間30分");
    });

    it("0 → 0分", () => {
      expect(formatQuantityWithUnit(0, "分")).toBe("0分");
    });

    it("150 → 2時間30分", () => {
      expect(formatQuantityWithUnit(150, "分")).toBe("2時間30分");
    });

    it("45 → 45分", () => {
      expect(formatQuantityWithUnit(45, "分")).toBe("45分");
    });

    it("120 → 2時間", () => {
      expect(formatQuantityWithUnit(120, "分")).toBe("2時間");
    });

    it("小数の分は四捨五入される (89.6 → 1時間30分)", () => {
      expect(formatQuantityWithUnit(89.6, "分")).toBe("1時間30分");
    });
  });

  describe('単位が "minute" / "minutes" の場合', () => {
    it("90 → 1時間30分", () => {
      expect(formatQuantityWithUnit(90, "minute")).toBe("1時間30分");
    });

    it("45 → 45分", () => {
      expect(formatQuantityWithUnit(45, "minutes")).toBe("45分");
    });
  });

  describe("一般的な単位の場合", () => {
    it('5回 → "5回"', () => {
      expect(formatQuantityWithUnit(5, "回")).toBe("5回");
    });

    it('3.14km → "3.1km" (小数点第1位で四捨五入)', () => {
      expect(formatQuantityWithUnit(3.14, "km")).toBe("3.1km");
    });

    it('100kcal → "100kcal"', () => {
      expect(formatQuantityWithUnit(100, "kcal")).toBe("100kcal");
    });

    it("0の場合", () => {
      expect(formatQuantityWithUnit(0, "回")).toBe("0回");
    });
  });

  describe("境界値・エッジケース", () => {
    it("1.999 → 1時間60分（実装の既知の制限: 60分→時間の正規化なし）", () => {
      expect(formatQuantityWithUnit(1.999, "時間")).toBe("1時間60分");
    });

    it("1.99 → 1時間59分", () => {
      expect(formatQuantityWithUnit(1.99, "時間")).toBe("1時間59分");
    });

    it("非常に小さい小数", () => {
      expect(formatQuantityWithUnit(0.01, "時間")).toBe("1分");
    });
  });
});

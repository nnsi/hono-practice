import { describe, expect, it } from "vitest";
import {
  convertSecondsToUnit,
  formatElapsedTime,
  generateTimeMemo,
  getTimeUnitType,
  isTimeUnit,
} from "./timeUtils";

describe("isTimeUnit", () => {
  // 時間系の単位はtrueを返す
  it.each([
    ["時間", true],
    ["時", true],
    ["分", true],
    ["秒", true],
    ["hour", true],
    ["hours", true],
    ["minutes", true],
    ["seconds", true],
    ["min", true],
    ["sec", true],
  ])('"%s" → %s', (unit, expected) => {
    expect(isTimeUnit(unit)).toBe(expected);
  });

  // 大文字小文字を区別しない
  it.each(["Hour", "HOUR", "Minutes", "SECONDS", "Min", "SEC"])(
    '大文字小文字を無視: "%s" → true',
    (unit) => {
      expect(isTimeUnit(unit)).toBe(true);
    },
  );

  // 時間系でない単位はfalseを返す
  it.each(["回", "km", "個", "歩", "kcal", "ml"])('"%s" → false', (unit) => {
    expect(isTimeUnit(unit)).toBe(false);
  });

  // includes()による誤検出パターン（"min"を含む語、"sec"を含む語など）
  // isTimeUnit は部分文字列マッチのため、以下は true を返す（既知の制限）
  it.each(["admin", "examine", "seminary"])(
    '部分文字列一致の制限: "%s" → true（"min"を含む）',
    (unit) => {
      expect(isTimeUnit(unit)).toBe(true);
    },
  );

  it.each(["security", "insect", "section"])(
    '部分文字列一致の制限: "%s" → true（"sec"を含む）',
    (unit) => {
      expect(isTimeUnit(unit)).toBe(true);
    },
  );

  // null / undefined / 空文字
  it("null → false", () => {
    expect(isTimeUnit(null)).toBe(false);
  });

  it("undefined → false", () => {
    expect(isTimeUnit(undefined)).toBe(false);
  });

  it("空文字 → false", () => {
    expect(isTimeUnit("")).toBe(false);
  });
});

describe("getTimeUnitType", () => {
  // hour系
  it.each([
    ["時間", "hour"],
    ["時", "hour"],
    ["hour", "hour"],
    ["hours", "hour"],
    ["Hour", "hour"],
  ])('"%s" → "%s"', (unit, expected) => {
    expect(getTimeUnitType(unit)).toBe(expected);
  });

  // minute系
  it.each([
    ["分", "minute"],
    ["min", "minute"],
    ["minutes", "minute"],
    ["Minutes", "minute"],
  ])('"%s" → "%s"', (unit, expected) => {
    expect(getTimeUnitType(unit)).toBe(expected);
  });

  // second系
  it.each([
    ["秒", "second"],
    ["sec", "second"],
    ["seconds", "second"],
    ["Seconds", "second"],
  ])('"%s" → "%s"', (unit, expected) => {
    expect(getTimeUnitType(unit)).toBe(expected);
  });

  // 該当しない単位 → null
  it.each(["回", "km", "個"])('"%s" → null', (unit) => {
    expect(getTimeUnitType(unit)).toBeNull();
  });

  it("null → null", () => {
    expect(getTimeUnitType(null)).toBeNull();
  });

  it("undefined → null", () => {
    expect(getTimeUnitType(undefined)).toBeNull();
  });
});

describe("convertSecondsToUnit", () => {
  describe("hour変換", () => {
    it("3600秒 → 1時間", () => {
      expect(convertSecondsToUnit(3600, "hour")).toBe(1);
    });

    it("7200秒 → 2時間", () => {
      expect(convertSecondsToUnit(7200, "hour")).toBe(2);
    });

    it("5400秒 → 1.5時間", () => {
      expect(convertSecondsToUnit(5400, "hour")).toBe(1.5);
    });

    it("0秒 → 0時間", () => {
      expect(convertSecondsToUnit(0, "hour")).toBe(0);
    });
  });

  describe("minute変換", () => {
    it("60秒 → 1分", () => {
      expect(convertSecondsToUnit(60, "minute")).toBe(1);
    });

    it("90秒 → 1.5分", () => {
      expect(convertSecondsToUnit(90, "minute")).toBe(1.5);
    });

    it("0秒 → 0分", () => {
      expect(convertSecondsToUnit(0, "minute")).toBe(0);
    });
  });

  describe("second変換", () => {
    it("30秒 → 30秒（そのまま）", () => {
      expect(convertSecondsToUnit(30, "second")).toBe(30);
    });

    it("0秒 → 0秒", () => {
      expect(convertSecondsToUnit(0, "second")).toBe(0);
    });
  });

  describe("unitTypeがnullの場合", () => {
    it("秒をそのまま返す", () => {
      expect(convertSecondsToUnit(120, null)).toBe(120);
    });
  });
});

describe("generateTimeMemo", () => {
  it("通常の時間範囲を正しくフォーマットする", () => {
    const start = new Date(2024, 0, 1, 9, 30);
    const end = new Date(2024, 0, 1, 10, 45);
    expect(generateTimeMemo(start, end)).toBe("09:30 - 10:45");
  });

  it("1桁の時間をゼロ埋めする", () => {
    const start = new Date(2024, 0, 1, 1, 5);
    const end = new Date(2024, 0, 1, 2, 8);
    expect(generateTimeMemo(start, end)).toBe("01:05 - 02:08");
  });

  it("深夜0時を正しくフォーマットする", () => {
    const start = new Date(2024, 0, 1, 0, 0);
    const end = new Date(2024, 0, 1, 0, 30);
    expect(generateTimeMemo(start, end)).toBe("00:00 - 00:30");
  });

  it("23:59を正しくフォーマットする", () => {
    const start = new Date(2024, 0, 1, 23, 0);
    const end = new Date(2024, 0, 1, 23, 59);
    expect(generateTimeMemo(start, end)).toBe("23:00 - 23:59");
  });

  it("同じ時刻でも正しくフォーマットする", () => {
    const time = new Date(2024, 0, 1, 12, 0);
    expect(generateTimeMemo(time, time)).toBe("12:00 - 12:00");
  });
});

describe("formatElapsedTime", () => {
  it("0ミリ秒 → 00:00", () => {
    expect(formatElapsedTime(0)).toBe("00:00");
  });

  it("1000ミリ秒 → 00:01", () => {
    expect(formatElapsedTime(1000)).toBe("00:01");
  });

  it("60000ミリ秒 → 01:00", () => {
    expect(formatElapsedTime(60000)).toBe("01:00");
  });

  it("59000ミリ秒 → 00:59", () => {
    expect(formatElapsedTime(59000)).toBe("00:59");
  });

  it("3599000ミリ秒（59分59秒） → 59:59", () => {
    expect(formatElapsedTime(3599000)).toBe("59:59");
  });

  it("3600000ミリ秒（1時間） → 1:00:00", () => {
    expect(formatElapsedTime(3600000)).toBe("1:00:00");
  });

  it("3661000ミリ秒（1時間1分1秒） → 1:01:01", () => {
    expect(formatElapsedTime(3661000)).toBe("1:01:01");
  });

  it("7200000ミリ秒（2時間） → 2:00:00", () => {
    expect(formatElapsedTime(7200000)).toBe("2:00:00");
  });

  it("端数ミリ秒は切り捨てる", () => {
    expect(formatElapsedTime(1500)).toBe("00:01");
    expect(formatElapsedTime(999)).toBe("00:00");
  });
});

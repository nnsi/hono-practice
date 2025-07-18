import { describe, expect, it } from "vitest";

import {
  convertSecondsToUnit,
  generateTimeMemo,
  getTimeUnitType,
  isTimeUnit,
} from "../timeUtils";

describe("isTimeUnit", () => {
  it("日本語の時間単位を正しく判定する", () => {
    expect(isTimeUnit("時")).toBe(true);
    expect(isTimeUnit("分")).toBe(true);
    expect(isTimeUnit("秒")).toBe(true);
    expect(isTimeUnit("時間")).toBe(true);
  });

  it("英語の時間単位を正しく判定する", () => {
    expect(isTimeUnit("hour")).toBe(true);
    expect(isTimeUnit("min")).toBe(true);
    expect(isTimeUnit("sec")).toBe(true);
    expect(isTimeUnit("Hour")).toBe(true); // 大文字小文字を区別しない
    expect(isTimeUnit("MIN")).toBe(true);
  });

  it("時間単位でない文字列を正しく判定する", () => {
    expect(isTimeUnit("個")).toBe(false);
    expect(isTimeUnit("回")).toBe(false);
    expect(isTimeUnit("meter")).toBe(false);
  });

  it("nullやundefinedを正しく処理する", () => {
    expect(isTimeUnit(null)).toBe(false);
    expect(isTimeUnit(undefined)).toBe(false);
    expect(isTimeUnit("")).toBe(false);
  });

  it("時間単位を含む複合語を正しく判定する", () => {
    expect(isTimeUnit("1時間")).toBe(true);
    expect(isTimeUnit("分数")).toBe(true);
    expect(isTimeUnit("hours")).toBe(true);
  });
});

describe("getTimeUnitType", () => {
  it("時間の単位を正しく識別する", () => {
    expect(getTimeUnitType("時")).toBe("hour");
    expect(getTimeUnitType("時間")).toBe("hour");
    expect(getTimeUnitType("hour")).toBe("hour");
    expect(getTimeUnitType("hours")).toBe("hour");
    expect(getTimeUnitType("Hour")).toBe("hour");
  });

  it("分の単位を正しく識別する", () => {
    expect(getTimeUnitType("分")).toBe("minute");
    expect(getTimeUnitType("min")).toBe("minute");
    expect(getTimeUnitType("minute")).toBe("minute");
    expect(getTimeUnitType("Min")).toBe("minute");
  });

  it("秒の単位を正しく識別する", () => {
    expect(getTimeUnitType("秒")).toBe("second");
    expect(getTimeUnitType("sec")).toBe("second");
    expect(getTimeUnitType("second")).toBe("second");
    expect(getTimeUnitType("Sec")).toBe("second");
  });

  it("時間単位でない場合はnullを返す", () => {
    expect(getTimeUnitType("個")).toBe(null);
    expect(getTimeUnitType("回")).toBe(null);
    expect(getTimeUnitType("meter")).toBe(null);
  });

  it("nullやundefinedに対してnullを返す", () => {
    expect(getTimeUnitType(null)).toBe(null);
    expect(getTimeUnitType(undefined)).toBe(null);
    expect(getTimeUnitType("")).toBe(null);
  });
});

describe("convertSecondsToUnit", () => {
  it("秒を時間に正しく変換する", () => {
    expect(convertSecondsToUnit(3600, "hour")).toBe(1);
    expect(convertSecondsToUnit(7200, "hour")).toBe(2);
    expect(convertSecondsToUnit(5400, "hour")).toBe(1.5);
    expect(convertSecondsToUnit(3661, "hour")).toBe(1.02); // 小数点2桁まで
  });

  it("秒を分に正しく変換する", () => {
    expect(convertSecondsToUnit(60, "minute")).toBe(1);
    expect(convertSecondsToUnit(120, "minute")).toBe(2);
    expect(convertSecondsToUnit(90, "minute")).toBe(1.5);
    expect(convertSecondsToUnit(65, "minute")).toBe(1.1); // 小数点1桁まで
  });

  it("秒をそのまま返す", () => {
    expect(convertSecondsToUnit(30, "second")).toBe(30);
    expect(convertSecondsToUnit(45.5, "second")).toBe(45.5);
  });

  it("nullの場合は秒をそのまま返す", () => {
    expect(convertSecondsToUnit(100, null)).toBe(100);
  });

  it("小数の丸めが正しく動作する", () => {
    // 時間：小数点2桁
    expect(convertSecondsToUnit(3665, "hour")).toBe(1.02);
    expect(convertSecondsToUnit(3670, "hour")).toBe(1.02);

    // 分：小数点1桁
    expect(convertSecondsToUnit(63, "minute")).toBe(1.1);
    expect(convertSecondsToUnit(64, "minute")).toBe(1.1);
  });

  it("0秒の変換を正しく処理する", () => {
    expect(convertSecondsToUnit(0, "hour")).toBe(0);
    expect(convertSecondsToUnit(0, "minute")).toBe(0);
    expect(convertSecondsToUnit(0, "second")).toBe(0);
  });
});

describe("generateTimeMemo", () => {
  it("開始・終了時刻を正しいフォーマットで出力する", () => {
    const start = new Date("2024-01-15T09:30:00");
    const end = new Date("2024-01-15T10:45:00");
    expect(generateTimeMemo(start, end)).toBe("09:30 - 10:45");
  });

  it("0時台の時刻を正しくフォーマットする", () => {
    const start = new Date("2024-01-15T00:05:00");
    const end = new Date("2024-01-15T00:30:00");
    expect(generateTimeMemo(start, end)).toBe("00:05 - 00:30");
  });

  it("日付をまたぐ時刻を正しくフォーマットする", () => {
    const start = new Date("2024-01-15T23:30:00");
    const end = new Date("2024-01-16T01:15:00");
    expect(generateTimeMemo(start, end)).toBe("23:30 - 01:15");
  });

  it("1桁の時刻を0埋めして表示する", () => {
    const start = new Date("2024-01-15T05:05:00");
    const end = new Date("2024-01-15T09:09:00");
    expect(generateTimeMemo(start, end)).toBe("05:05 - 09:09");
  });

  it("秒は無視される", () => {
    const start = new Date("2024-01-15T10:30:45");
    const end = new Date("2024-01-15T11:45:59");
    expect(generateTimeMemo(start, end)).toBe("10:30 - 11:45");
  });

  it("同じ時刻でも正しく表示する", () => {
    const time = new Date("2024-01-15T15:30:00");
    expect(generateTimeMemo(time, time)).toBe("15:30 - 15:30");
  });
});

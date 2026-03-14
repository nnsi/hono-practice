import { describe, expect, it } from "vitest";

import {
  buildDayTargets,
  getDailyTargetForDate,
  parseDayTargets,
} from "./dayTargets";

describe("parseDayTargets", () => {
  it("null/undefined → null", () => {
    expect(parseDayTargets(null)).toBeNull();
    expect(parseDayTargets(undefined)).toBeNull();
  });

  it("有効なオブジェクト → DayTargets", () => {
    const result = parseDayTargets({ "1": 10, "7": 0 });
    expect(result).toEqual({ 1: 10, 7: 0 });
  });

  it("JSON文字列 → パースして DayTargets", () => {
    const result = parseDayTargets('{"1": 15, "6": 20}');
    expect(result).toEqual({ 1: 15, 6: 20 });
  });

  it("不正キー(8, foo)は無視", () => {
    const result = parseDayTargets({ "1": 10, "8": 99, foo: 5 });
    expect(result).toEqual({ 1: 10 });
  });

  it("負数は無視", () => {
    const result = parseDayTargets({ "1": -5, "2": 10 });
    expect(result).toEqual({ 2: 10 });
  });

  it("全キーが不正 → null", () => {
    expect(parseDayTargets({ "8": 10, "9": 20 })).toBeNull();
  });

  it("空オブジェクト → null", () => {
    expect(parseDayTargets({})).toBeNull();
  });

  it("配列 → null", () => {
    expect(parseDayTargets([1, 2, 3])).toBeNull();
  });

  it("不正JSON文字列 → null", () => {
    expect(parseDayTargets("not json")).toBeNull();
  });

  it("JSON配列文字列 → null", () => {
    expect(parseDayTargets("[1,2,3]")).toBeNull();
  });

  it("NaN/Infinity値は無視", () => {
    const result = parseDayTargets({
      "1": Number.NaN,
      "2": Number.POSITIVE_INFINITY,
      "3": 5,
    });
    expect(result).toEqual({ 3: 5 });
  });

  it("数値0は有効", () => {
    const result = parseDayTargets({ "7": 0 });
    expect(result).toEqual({ 7: 0 });
  });
});

describe("buildDayTargets", () => {
  it("有効な値 → DayTargets", () => {
    const result = buildDayTargets({ "1": "10", "7": "0" });
    expect(result).toEqual({ 1: 10, 7: 0 });
  });

  it("空文字列はスキップ", () => {
    const result = buildDayTargets({ "1": "10", "2": "" });
    expect(result).toEqual({ 1: 10 });
  });

  it("全て空 → null", () => {
    expect(buildDayTargets({})).toBeNull();
  });

  it("不正な数値文字列はスキップ", () => {
    const result = buildDayTargets({ "1": "abc", "2": "10" });
    expect(result).toEqual({ 2: 10 });
  });

  it("負数はスキップ", () => {
    const result = buildDayTargets({ "1": "-5", "2": "10" });
    expect(result).toEqual({ 2: 10 });
  });
});

describe("getDailyTargetForDate", () => {
  it("dayTargets null → dailyTargetQuantity", () => {
    expect(getDailyTargetForDate(10, null, "2026-01-05")).toBe(10);
  });

  it("曜日が指定あり → その値", () => {
    // 2026-01-05 is Monday (ISO weekday 1)
    expect(getDailyTargetForDate(10, { 1: 15 }, "2026-01-05")).toBe(15);
  });

  it("曜日が未指定 → dailyTargetQuantity", () => {
    // 2026-01-06 is Tuesday (ISO weekday 2), dayTargets has only Sunday
    expect(getDailyTargetForDate(10, { 7: 0 }, "2026-01-06")).toBe(10);
  });

  it("日曜にtarget=0 → 0を返す", () => {
    // 2026-01-11 is Sunday (ISO weekday 7)
    expect(getDailyTargetForDate(10, { 7: 0 }, "2026-01-11")).toBe(0);
  });
});

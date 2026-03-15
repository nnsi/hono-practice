import { describe, expect, test } from "vitest";

import { buildDedupKey, buildDedupSet } from "./csvDedup";

describe("buildDedupKey", () => {
  test("同じフィールドから同じキーを生成する", () => {
    const fields = {
      date: "2024-01-01",
      activityId: "abc",
      quantity: 5,
      memo: "朝ラン",
    };
    expect(buildDedupKey(fields)).toBe("2024-01-01|abc|5|朝ラン");
    expect(buildDedupKey(fields)).toBe(buildDedupKey({ ...fields }));
  });

  test("quantity が null の場合は空文字になる", () => {
    const key = buildDedupKey({
      date: "2024-01-01",
      activityId: "abc",
      quantity: null,
      memo: "",
    });
    expect(key).toBe("2024-01-01|abc||");
  });

  test("memo が異なれば異なるキーになる", () => {
    const base = { date: "2024-01-01", activityId: "abc", quantity: 5 };
    expect(buildDedupKey({ ...base, memo: "朝" })).not.toBe(
      buildDedupKey({ ...base, memo: "夜" }),
    );
  });
});

describe("buildDedupSet", () => {
  test("既存ログからSetを構築できる", () => {
    const logs = [
      { date: "2024-01-01", activityId: "a1", quantity: 5, memo: "x" },
      { date: "2024-01-02", activityId: "a2", quantity: null, memo: "" },
    ];
    const set = buildDedupSet(logs);
    expect(set.size).toBe(2);
    expect(set.has(buildDedupKey(logs[0]))).toBe(true);
    expect(set.has(buildDedupKey(logs[1]))).toBe(true);
  });

  test("重複ログがあってもSetなので1つになる", () => {
    const log = { date: "2024-01-01", activityId: "a1", quantity: 5, memo: "" };
    const set = buildDedupSet([log, log]);
    expect(set.size).toBe(1);
  });

  test("空配列から空Setを返す", () => {
    expect(buildDedupSet([]).size).toBe(0);
  });
});

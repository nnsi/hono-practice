import { describe, expect, it } from "vitest";

import { getVisibleKindsForCharts } from "./getVisibleKindsForCharts";

const makeKind = (
  overrides: Partial<{
    id: string | null;
    name: string;
    color: string | null;
    total: number;
    logs: { date: string; quantity: number }[];
  }> & { name: string; total: number },
) => ({
  id: overrides.id ?? overrides.name,
  color: overrides.color ?? null,
  logs: overrides.logs ?? [],
  ...overrides,
});

describe("getVisibleKindsForCharts", () => {
  it("showCombinedStats=true の場合は total=0 のkindも含めて全て返す", () => {
    const stat = {
      showCombinedStats: true,
      kinds: [
        makeKind({ name: "朝", total: 5 }),
        makeKind({ name: "夜", total: 0 }),
      ],
    };
    const result = getVisibleKindsForCharts(stat);
    expect(result).toHaveLength(2);
    expect(result.map((k) => k.name)).toEqual(["朝", "夜"]);
  });

  it("showCombinedStats=false の場合は total=0 のkindを除外する", () => {
    const stat = {
      showCombinedStats: false,
      kinds: [
        makeKind({ name: "朝", total: 5 }),
        makeKind({ name: "昼", total: 0 }),
        makeKind({ name: "夜", total: 10 }),
      ],
    };
    const result = getVisibleKindsForCharts(stat);
    expect(result).toHaveLength(2);
    expect(result.map((k) => k.name)).toEqual(["朝", "夜"]);
  });

  it("showCombinedStats=false で全kindがtotal=0の場合は空配列を返す", () => {
    const stat = {
      showCombinedStats: false,
      kinds: [
        makeKind({ name: "朝", total: 0 }),
        makeKind({ name: "夜", total: 0 }),
      ],
    };
    const result = getVisibleKindsForCharts(stat);
    expect(result).toEqual([]);
  });

  it("showCombinedStats=false で全kindがtotal>0なら全て残る", () => {
    const stat = {
      showCombinedStats: false,
      kinds: [
        makeKind({ name: "朝", total: 3 }),
        makeKind({ name: "夜", total: 7 }),
      ],
    };
    const result = getVisibleKindsForCharts(stat);
    expect(result).toHaveLength(2);
  });

  it("負の total は除外される（防御的）", () => {
    const stat = {
      showCombinedStats: false,
      kinds: [
        makeKind({ name: "朝", total: 5 }),
        makeKind({ name: "謎", total: -1 }),
      ],
    };
    const result = getVisibleKindsForCharts(stat);
    expect(result.map((k) => k.name)).toEqual(["朝"]);
  });
});

import { describe, expect, it, vi } from "vitest";

import type { RecordingModeProps } from "../types";
import { createUseBinaryMode } from "./createUseBinaryMode";

function makeUseState() {
  function useState<T>(
    init: T | (() => T),
  ): [T, (value: T | ((prev: T) => T)) => void];
  function useState<T = undefined>(): [
    T | undefined,
    (value: T | ((prev: T | undefined) => T | undefined) | undefined) => void,
  ];
  function useState<T>(init?: T | (() => T)): [T, unknown] {
    let value: T =
      init === undefined
        ? (undefined as T)
        : typeof init === "function"
          ? (init as () => T)()
          : init;
    const setValue = (v: unknown) => {
      value = typeof v === "function" ? (v as (prev: T) => T)(value) : (v as T);
    };
    return [value, setValue];
  }
  return useState;
}

const kinds = [
  { id: "k1", name: "勝ち", color: "#00ff00" },
  { id: "k2", name: "負け", color: "#ff0000" },
];

function makeProps(
  overrides: Partial<RecordingModeProps> = {},
): RecordingModeProps {
  return {
    activity: {
      id: "a1",
      name: "Game",
      emoji: "🎮",
      quantityUnit: "回",
      recordingMode: "binary",
      recordingModeConfig: null,
      ...overrides.activity,
    },
    kinds,
    date: "2025-01-01",
    onSave: vi.fn().mockResolvedValue(undefined),
    isSubmitting: false,
    todayLogs: [],
    ...overrides,
  };
}

describe("createUseBinaryMode", () => {
  const useBinaryMode = createUseBinaryMode({
    react: { useState: makeUseState() },
  });

  it("creates kindTallies from kinds with zero counts", () => {
    const vm = useBinaryMode(makeProps());
    expect(vm.kindTallies).toEqual([
      { id: "k1", name: "勝ち", color: "#00ff00", count: 0 },
      { id: "k2", name: "負け", color: "#ff0000", count: 0 },
    ]);
  });

  it("hasKinds is true when kinds exist", () => {
    const vm = useBinaryMode(makeProps());
    expect(vm.hasKinds).toBe(true);
  });

  it("hasKinds is false when no kinds", () => {
    const vm = useBinaryMode(makeProps({ kinds: [] }));
    expect(vm.hasKinds).toBe(false);
  });

  it("selectKind calls onSave with kindId and quantity 1", () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const vm = useBinaryMode(makeProps({ onSave }));
    vm.selectKind("k1");
    expect(onSave).toHaveBeenCalledWith({
      quantity: 1,
      activityKindId: "k1",
      memo: "",
    });
  });

  it("computes tallies from todayLogs", () => {
    const vm = useBinaryMode(
      makeProps({
        todayLogs: [
          { activityKindId: "k1", quantity: 1 },
          { activityKindId: "k1", quantity: 1 },
          { activityKindId: "k2", quantity: 1 },
        ],
      }),
    );
    expect(vm.kindTallies[0].count).toBe(2);
    expect(vm.kindTallies[1].count).toBe(1);
  });

  it("tallies are 0 when no todayLogs", () => {
    const vm = useBinaryMode(makeProps({ todayLogs: undefined }));
    expect(vm.kindTallies[0].count).toBe(0);
    expect(vm.kindTallies[1].count).toBe(0);
  });

  it("supports more than 2 kinds", () => {
    const threeKinds = [
      { id: "k1", name: "勝ち", color: "#00ff00" },
      { id: "k2", name: "負け", color: "#ff0000" },
      { id: "k3", name: "引分", color: "#888888" },
    ];
    const vm = useBinaryMode(
      makeProps({
        kinds: threeKinds,
        todayLogs: [
          { activityKindId: "k3", quantity: 1 },
          { activityKindId: "k3", quantity: 1 },
        ],
      }),
    );
    expect(vm.kindTallies).toHaveLength(3);
    expect(vm.kindTallies[2].count).toBe(2);
  });
});

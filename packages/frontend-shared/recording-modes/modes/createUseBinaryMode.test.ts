// @vitest-environment jsdom

import { useState } from "react";

import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { RecordingModeProps } from "../types";
import { createUseBinaryMode } from "./createUseBinaryMode";

const useBinaryMode = createUseBinaryMode({ react: { useState } });

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
  it("creates kindTallies from kinds with zero counts", () => {
    const { result } = renderHook(() => useBinaryMode(makeProps()));
    expect(result.current.kindTallies).toEqual([
      { id: "k1", name: "勝ち", color: "#00ff00", count: 0 },
      { id: "k2", name: "負け", color: "#ff0000", count: 0 },
    ]);
  });

  it("hasKinds is true when kinds exist", () => {
    const { result } = renderHook(() => useBinaryMode(makeProps()));
    expect(result.current.hasKinds).toBe(true);
  });

  it("hasKinds is false when no kinds", () => {
    const { result } = renderHook(() =>
      useBinaryMode(makeProps({ kinds: [] })),
    );
    expect(result.current.hasKinds).toBe(false);
  });

  it("selectKind calls onSave with kindId and quantity 1", () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => useBinaryMode(makeProps({ onSave })));
    act(() => result.current.selectKind("k1"));
    expect(onSave).toHaveBeenCalledWith({
      quantity: 1,
      activityKindId: "k1",
      memo: "",
    });
  });

  it("computes tallies from todayLogs", () => {
    const { result } = renderHook(() =>
      useBinaryMode(
        makeProps({
          todayLogs: [
            { activityKindId: "k1", quantity: 1 },
            { activityKindId: "k1", quantity: 1 },
            { activityKindId: "k2", quantity: 1 },
          ],
        }),
      ),
    );
    expect(result.current.kindTallies[0].count).toBe(2);
    expect(result.current.kindTallies[1].count).toBe(1);
  });

  it("tallies are 0 when no todayLogs", () => {
    const { result } = renderHook(() =>
      useBinaryMode(makeProps({ todayLogs: undefined })),
    );
    expect(result.current.kindTallies[0].count).toBe(0);
    expect(result.current.kindTallies[1].count).toBe(0);
  });

  it("supports more than 2 kinds", () => {
    const threeKinds = [
      { id: "k1", name: "勝ち", color: "#00ff00" },
      { id: "k2", name: "負け", color: "#ff0000" },
      { id: "k3", name: "引分", color: "#888888" },
    ];
    const { result } = renderHook(() =>
      useBinaryMode(
        makeProps({
          kinds: threeKinds,
          todayLogs: [
            { activityKindId: "k3", quantity: 1 },
            { activityKindId: "k3", quantity: 1 },
          ],
        }),
      ),
    );
    expect(result.current.kindTallies).toHaveLength(3);
    expect(result.current.kindTallies[2].count).toBe(2);
  });
});

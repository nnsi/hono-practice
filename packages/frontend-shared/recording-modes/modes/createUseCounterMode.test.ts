// @vitest-environment jsdom

import { useState } from "react";

import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { RecordingModeProps } from "../types";
import { createUseCounterMode } from "./createUseCounterMode";

const useCounterMode = createUseCounterMode({ react: { useState } });

function makeProps(
  overrides: Partial<RecordingModeProps> = {},
): RecordingModeProps {
  return {
    activity: {
      id: "a1",
      name: "Push-ups",
      emoji: "💪",
      quantityUnit: "回",
      recordingMode: "counter",
      recordingModeConfig: '{"mode":"counter","steps":[1,5,10]}',
      ...overrides.activity,
    },
    kinds: [],
    date: "2025-01-01",
    onSave: vi.fn().mockResolvedValue(undefined),
    isSubmitting: false,
    ...overrides,
  };
}

describe("createUseCounterMode", () => {
  it("parses steps from activity config", () => {
    const { result } = renderHook(() => useCounterMode(makeProps()));
    expect(result.current.steps).toEqual([1, 5, 10]);
  });

  it("falls back to default steps when config is null", () => {
    const { result } = renderHook(() =>
      useCounterMode(
        makeProps({
          activity: {
            id: "a1",
            name: "Test",
            emoji: "📝",
            quantityUnit: "回",
            recordingMode: "counter",
            recordingModeConfig: null,
          },
        }),
      ),
    );
    expect(result.current.steps).toEqual([1, 10, 100]);
  });

  it("falls back to default steps for invalid config", () => {
    const { result } = renderHook(() =>
      useCounterMode(
        makeProps({
          activity: {
            id: "a1",
            name: "Test",
            emoji: "📝",
            quantityUnit: "回",
            recordingMode: "counter",
            recordingModeConfig: "{invalid}",
          },
        }),
      ),
    );
    expect(result.current.steps).toEqual([1, 10, 100]);
  });

  it("recordStep calls onSave with step quantity immediately", () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => useCounterMode(makeProps({ onSave })));
    act(() => result.current.recordStep(5));
    expect(onSave).toHaveBeenCalledWith({
      quantity: 5,
      activityKindId: null,
      memo: "",
    });
  });

  it("todayTotal sums quantity from todayLogs", () => {
    const { result } = renderHook(() =>
      useCounterMode(
        makeProps({
          todayLogs: [
            { activityKindId: null, quantity: 5 },
            { activityKindId: null, quantity: 10 },
            { activityKindId: null, quantity: 3 },
          ],
        }),
      ),
    );
    expect(result.current.todayTotal).toBe(18);
  });

  it("todayTotal is 0 when no todayLogs", () => {
    const { result } = renderHook(() => useCounterMode(makeProps()));
    expect(result.current.todayTotal).toBe(0);
  });

  it("submitManual calls onSave with manual quantity and memo", () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => useCounterMode(makeProps({ onSave })));
    act(() => {
      result.current.setQuantity("25");
      result.current.setMemo("test memo");
    });
    act(() => result.current.submitManual());
    expect(onSave).toHaveBeenCalledWith({
      quantity: 25,
      activityKindId: null,
      memo: "test memo",
    });
  });

  it("initializes with counter tab active", () => {
    const { result } = renderHook(() => useCounterMode(makeProps()));
    expect(result.current.activeTab).toBe("counter");
  });

  it("exposes quantityUnit from activity", () => {
    const { result } = renderHook(() => useCounterMode(makeProps()));
    expect(result.current.quantityUnit).toBe("回");
  });

  it("exposes kinds and isSubmitting from props", () => {
    const kinds = [{ id: "k1", name: "Sprint", color: "#ff0000" }];
    const { result } = renderHook(() =>
      useCounterMode(makeProps({ kinds, isSubmitting: true })),
    );
    expect(result.current.kinds).toEqual(kinds);
    expect(result.current.isSubmitting).toBe(true);
  });
});

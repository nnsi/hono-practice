import type React from "react";

import { DateContext } from "@frontend/providers/DateProvider";
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { useGlobalDate } from "../useGlobalDate";

describe("useGlobalDate", () => {
  it("DateProviderの外で使用された場合でもデフォルトコンテキスト値を返す", () => {
    // 注意: DateContextにはデフォルト値が設定されているため、
    // Provider外でも動作しますが、setDateは何もしません
    const { result } = renderHook(() => useGlobalDate());

    expect(result.current.date).toBeInstanceOf(Date);
    expect(result.current.setDate).toBeInstanceOf(Function);

    // setDateを呼んでも何も起こらない
    const newDate = new Date("2025-01-21");
    act(() => {
      result.current.setDate(newDate);
    });

    // 日付は変わらない（デフォルトのsetDateは何もしない）
    expect(result.current.date).not.toBe(newDate);
  });

  it("DateContextの値を正しく返す", () => {
    const mockDate = new Date("2025-01-20");
    const mockSetDate = vi.fn();
    const mockDateContext = {
      date: mockDate,
      setDate: mockSetDate,
    };

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <DateContext.Provider value={mockDateContext}>
        {children}
      </DateContext.Provider>
    );

    const { result } = renderHook(() => useGlobalDate(), { wrapper });

    expect(result.current).toBe(mockDateContext);
    expect(result.current.date).toBe(mockDate);
    expect(result.current.setDate).toBe(mockSetDate);
  });

  it("setDate関数が呼び出せる", () => {
    const mockDate = new Date("2025-01-20");
    const newDate = new Date("2025-01-21");
    const mockSetDate = vi.fn();
    const mockDateContext = {
      date: mockDate,
      setDate: mockSetDate,
    };

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <DateContext.Provider value={mockDateContext}>
        {children}
      </DateContext.Provider>
    );

    const { result } = renderHook(() => useGlobalDate(), { wrapper });

    act(() => {
      result.current.setDate(newDate);
    });

    expect(mockSetDate).toHaveBeenCalledWith(newDate);
  });
});

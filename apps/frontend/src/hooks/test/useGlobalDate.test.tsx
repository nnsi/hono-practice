import type React from "react";

import { DateProvider } from "@frontend/providers/DateProvider";
import { EventBusProvider } from "@frontend/providers/EventBusProvider";
import { createWindowEventBus } from "@frontend/services/abstractions";
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { useGlobalDate } from "../useGlobalDate";

describe("useGlobalDate", () => {
  it("初期状態が正しく設定される", () => {
    const eventBus = createWindowEventBus();
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <EventBusProvider eventBus={eventBus}>
        <DateProvider>{children}</DateProvider>
      </EventBusProvider>
    );
    const { result } = renderHook(() => useGlobalDate(), { wrapper });

    expect(result.current.selectedDate).toBeInstanceOf(Date);
    expect(result.current.setSelectedDate).toBeInstanceOf(Function);
    expect(result.current.goToToday).toBeInstanceOf(Function);
    expect(result.current.goToPreviousDay).toBeInstanceOf(Function);
    expect(result.current.goToNextDay).toBeInstanceOf(Function);
    expect(result.current.isToday).toBeInstanceOf(Function);
    expect(result.current.formatDate).toBeInstanceOf(Function);
  });

  it("setSelectedDateが正しく動作する", () => {
    const eventBus = createWindowEventBus();
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <EventBusProvider eventBus={eventBus}>
        <DateProvider>{children}</DateProvider>
      </EventBusProvider>
    );

    const { result } = renderHook(() => useGlobalDate(), { wrapper });

    const newDate = new Date("2025-01-20");

    act(() => {
      result.current.setSelectedDate(newDate);
    });

    expect(result.current.selectedDate).toEqual(newDate);
  });

  it("日付ナビゲーション関数が正しく動作する", () => {
    const eventBus = createWindowEventBus();
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <EventBusProvider eventBus={eventBus}>
        <DateProvider>{children}</DateProvider>
      </EventBusProvider>
    );

    const { result } = renderHook(() => useGlobalDate(), { wrapper });

    const initialDate = result.current.selectedDate;

    // goToPreviousDay
    act(() => {
      result.current.goToPreviousDay();
    });

    const previousDate = result.current.selectedDate;
    expect(previousDate.getDate()).toBe(initialDate.getDate() - 1);

    // goToNextDay
    act(() => {
      result.current.goToNextDay();
    });

    expect(result.current.selectedDate.getDate()).toBe(initialDate.getDate());

    // goToToday
    act(() => {
      result.current.goToToday();
    });

    const today = new Date();
    expect(result.current.selectedDate.getDate()).toBe(today.getDate());
  });
});
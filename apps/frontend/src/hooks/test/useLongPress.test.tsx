import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useLongPress } from "../useLongPress";

describe("useLongPress", () => {
  beforeEach(() => {
    vi.clearAllTimers();
    vi.useFakeTimers();
  });

  it("デフォルトの遅延時間でonLongPressが呼ばれる", () => {
    const onLongPress = vi.fn();
    const { result } = renderHook(() => useLongPress({ onLongPress }));

    // ポインターダウンイベントを発火
    act(() => {
      result.current.onPointerDown();
    });

    // 699msでは呼ばれない
    vi.advanceTimersByTime(699);
    expect(onLongPress).not.toHaveBeenCalled();

    // 700msで呼ばれる
    vi.advanceTimersByTime(1);
    expect(onLongPress).toHaveBeenCalledTimes(1);
  });

  it("カスタム遅延時間でonLongPressが呼ばれる", () => {
    const onLongPress = vi.fn();
    const delay = 500;
    const { result } = renderHook(() => useLongPress({ onLongPress, delay }));

    act(() => {
      result.current.onPointerDown();
    });

    // 499msでは呼ばれない
    vi.advanceTimersByTime(499);
    expect(onLongPress).not.toHaveBeenCalled();

    // 500msで呼ばれる
    vi.advanceTimersByTime(1);
    expect(onLongPress).toHaveBeenCalledTimes(1);
  });

  it("ポインターアップでタイマーがキャンセルされる", () => {
    const onLongPress = vi.fn();
    const { result } = renderHook(() => useLongPress({ onLongPress }));

    act(() => {
      result.current.onPointerDown();
    });
    vi.advanceTimersByTime(500);

    // ポインターアップでタイマーをキャンセル
    act(() => {
      result.current.onPointerUp();
    });
    vi.advanceTimersByTime(200);

    // onLongPressは呼ばれない
    expect(onLongPress).not.toHaveBeenCalled();
  });

  it("ポインターリーブでタイマーがキャンセルされる", () => {
    const onLongPress = vi.fn();
    const { result } = renderHook(() => useLongPress({ onLongPress }));

    act(() => {
      result.current.onPointerDown();
    });
    vi.advanceTimersByTime(500);

    // ポインターリーブでタイマーをキャンセル
    act(() => {
      result.current.onPointerLeave();
    });
    vi.advanceTimersByTime(200);

    // onLongPressは呼ばれない
    expect(onLongPress).not.toHaveBeenCalled();
  });

  it("複数回の押下で正しく動作する", () => {
    const onLongPress = vi.fn();
    const { result } = renderHook(() => useLongPress({ onLongPress }));

    // 1回目の押下（途中でキャンセル）
    act(() => {
      result.current.onPointerDown();
    });
    vi.advanceTimersByTime(500);
    act(() => {
      result.current.onPointerUp();
    });
    vi.advanceTimersByTime(200);
    expect(onLongPress).not.toHaveBeenCalled();

    // 2回目の押下（完了）
    act(() => {
      result.current.onPointerDown();
    });
    vi.advanceTimersByTime(700);
    expect(onLongPress).toHaveBeenCalledTimes(1);
  });

  it("すでにタイマーがない状態でポインターアップしてもエラーにならない", () => {
    const onLongPress = vi.fn();
    const { result } = renderHook(() => useLongPress({ onLongPress }));

    // タイマーを開始せずにポインターアップ
    expect(() => {
      result.current.onPointerUp();
    }).not.toThrow();

    expect(onLongPress).not.toHaveBeenCalled();
  });

  it("すでにタイマーがない状態でポインターリーブしてもエラーにならない", () => {
    const onLongPress = vi.fn();
    const { result } = renderHook(() => useLongPress({ onLongPress }));

    // タイマーを開始せずにポインターリーブ
    expect(() => {
      result.current.onPointerLeave();
    }).not.toThrow();

    expect(onLongPress).not.toHaveBeenCalled();
  });

  it("onLongPressコールバックが変更されても正しく動作する", () => {
    const onLongPress1 = vi.fn();
    const onLongPress2 = vi.fn();

    const { result, rerender } = renderHook(() =>
      useLongPress({ onLongPress: onLongPress1 }),
    );

    act(() => {
      result.current.onPointerDown();
    });
    vi.advanceTimersByTime(500);

    // コールバックを変更
    rerender({ onLongPress: onLongPress2 });

    vi.advanceTimersByTime(200);

    // 元のコールバックが呼ばれる（タイマー開始時のコールバック）
    expect(onLongPress1).toHaveBeenCalledTimes(1);
    expect(onLongPress2).not.toHaveBeenCalled();
  });
});

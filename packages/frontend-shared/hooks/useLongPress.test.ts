import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createUseLongPress } from "./useLongPress";

describe("createUseLongPress", () => {
  let onLongPress: ReturnType<typeof vi.fn>;
  let onClick: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    onLongPress = vi.fn();
    onClick = vi.fn();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  it("初期状態が正しいこと", () => {
    const { result } = renderHook(() => createUseLongPress({ onLongPress }));

    expect(result.current.isPressed).toBe(false);
    expect(typeof result.current.onMouseDown).toBe("function");
    expect(typeof result.current.onMouseUp).toBe("function");
    expect(typeof result.current.onMouseLeave).toBe("function");
    expect(typeof result.current.onTouchStart).toBe("function");
    expect(typeof result.current.onTouchEnd).toBe("function");
    expect(typeof result.current.onTouchMove).toBe("function");
  });

  describe("マウスイベント", () => {
    it("長押しを検出できること", () => {
      const { result } = renderHook(() =>
        createUseLongPress({ onLongPress, delay: 500 }),
      );

      const mouseEvent = {
        button: 0,
        clientX: 100,
        clientY: 200,
        preventDefault: vi.fn(),
      } as unknown as React.MouseEvent;

      act(() => {
        result.current.onMouseDown(mouseEvent);
      });

      expect(result.current.isPressed).toBe(true);
      expect(onLongPress).not.toHaveBeenCalled();

      act(() => {
        vi.advanceTimersByTime(500);
      });

      expect(onLongPress).toHaveBeenCalledTimes(1);
      expect(result.current.isPressed).toBe(false);
    });

    it("クリックを検出できること", () => {
      const { result } = renderHook(() =>
        createUseLongPress({ onLongPress, onClick, delay: 500 }),
      );

      const mouseDownEvent = {
        button: 0,
        clientX: 100,
        clientY: 200,
        preventDefault: vi.fn(),
      } as unknown as React.MouseEvent;

      const mouseUpEvent = {
        preventDefault: vi.fn(),
      } as unknown as React.MouseEvent;

      act(() => {
        result.current.onMouseDown(mouseDownEvent);
      });

      act(() => {
        vi.advanceTimersByTime(300); // 長押しのdelayより短い時間
      });

      act(() => {
        result.current.onMouseUp(mouseUpEvent);
      });

      expect(onLongPress).not.toHaveBeenCalled();
      expect(onClick).toHaveBeenCalledTimes(1);
      expect(result.current.isPressed).toBe(false);
    });

    it("右クリックは無視されること", () => {
      const { result } = renderHook(() => createUseLongPress({ onLongPress }));

      const mouseEvent = {
        button: 2, // 右クリック
        clientX: 100,
        clientY: 200,
        preventDefault: vi.fn(),
      } as unknown as React.MouseEvent;

      act(() => {
        result.current.onMouseDown(mouseEvent);
      });

      expect(result.current.isPressed).toBe(false);

      act(() => {
        vi.advanceTimersByTime(500);
      });

      expect(onLongPress).not.toHaveBeenCalled();
    });

    it("マウスが離れた時にキャンセルされること", () => {
      const { result } = renderHook(() =>
        createUseLongPress({ onLongPress, delay: 500 }),
      );

      const mouseDownEvent = {
        button: 0,
        clientX: 100,
        clientY: 200,
        preventDefault: vi.fn(),
      } as unknown as React.MouseEvent;

      const mouseLeaveEvent = {} as React.MouseEvent;

      act(() => {
        result.current.onMouseDown(mouseDownEvent);
      });

      expect(result.current.isPressed).toBe(true);

      act(() => {
        result.current.onMouseLeave(mouseLeaveEvent);
      });

      expect(result.current.isPressed).toBe(false);

      act(() => {
        vi.advanceTimersByTime(500);
      });

      expect(onLongPress).not.toHaveBeenCalled();
    });
  });

  describe("タッチイベント", () => {
    it("タッチで長押しを検出できること", () => {
      const { result } = renderHook(() =>
        createUseLongPress({ onLongPress, delay: 500 }),
      );

      const touchStartEvent = {
        touches: [{ clientX: 100, clientY: 200 }],
        preventDefault: vi.fn(),
      } as unknown as React.TouchEvent;

      act(() => {
        result.current.onTouchStart(touchStartEvent);
      });

      expect(result.current.isPressed).toBe(true);

      act(() => {
        vi.advanceTimersByTime(500);
      });

      expect(onLongPress).toHaveBeenCalledTimes(1);
      expect(result.current.isPressed).toBe(false);
    });

    it("タップを検出できること", () => {
      const { result } = renderHook(() =>
        createUseLongPress({ onLongPress, onClick, delay: 500 }),
      );

      const touchStartEvent = {
        touches: [{ clientX: 100, clientY: 200 }],
        preventDefault: vi.fn(),
      } as unknown as React.TouchEvent;

      const touchEndEvent = {
        preventDefault: vi.fn(),
      } as unknown as React.TouchEvent;

      act(() => {
        result.current.onTouchStart(touchStartEvent);
      });

      act(() => {
        vi.advanceTimersByTime(300);
      });

      act(() => {
        result.current.onTouchEnd(touchEndEvent);
      });

      expect(onLongPress).not.toHaveBeenCalled();
      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it("複数タッチの場合はキャンセルされること", () => {
      const { result } = renderHook(() => createUseLongPress({ onLongPress }));

      const touchStartEvent = {
        touches: [
          { clientX: 100, clientY: 200 },
          { clientX: 150, clientY: 250 },
        ],
        preventDefault: vi.fn(),
      } as unknown as React.TouchEvent;

      act(() => {
        result.current.onTouchStart(touchStartEvent);
      });

      expect(result.current.isPressed).toBe(false);

      act(() => {
        vi.advanceTimersByTime(500);
      });

      expect(onLongPress).not.toHaveBeenCalled();
    });

    it("移動した場合はキャンセルされること", () => {
      const { result } = renderHook(() =>
        createUseLongPress({ onLongPress, threshold: 10 }),
      );

      const touchStartEvent = {
        touches: [{ clientX: 100, clientY: 200 }],
        preventDefault: vi.fn(),
      } as unknown as React.TouchEvent;

      const touchMoveEvent = {
        touches: [{ clientX: 115, clientY: 200 }], // 15px移動（閾値10pxを超える）
        preventDefault: vi.fn(),
      } as unknown as React.TouchEvent;

      act(() => {
        result.current.onTouchStart(touchStartEvent);
      });

      expect(result.current.isPressed).toBe(true);

      act(() => {
        result.current.onTouchMove(touchMoveEvent);
      });

      expect(result.current.isPressed).toBe(false);

      act(() => {
        vi.advanceTimersByTime(500);
      });

      expect(onLongPress).not.toHaveBeenCalled();
    });

    it("閾値内の移動は許容されること", () => {
      const { result } = renderHook(() =>
        createUseLongPress({ onLongPress, threshold: 10, delay: 500 }),
      );

      const touchStartEvent = {
        touches: [{ clientX: 100, clientY: 200 }],
        preventDefault: vi.fn(),
      } as unknown as React.TouchEvent;

      const touchMoveEvent = {
        touches: [{ clientX: 105, clientY: 200 }], // 5px移動（閾値10px以内）
        preventDefault: vi.fn(),
      } as unknown as React.TouchEvent;

      act(() => {
        result.current.onTouchStart(touchStartEvent);
      });

      act(() => {
        result.current.onTouchMove(touchMoveEvent);
      });

      expect(result.current.isPressed).toBe(true);

      act(() => {
        vi.advanceTimersByTime(500);
      });

      expect(onLongPress).toHaveBeenCalledTimes(1);
    });
  });

  it("カスタムdelayが機能すること", () => {
    const { result } = renderHook(() =>
      createUseLongPress({ onLongPress, delay: 1000 }),
    );

    const mouseEvent = {
      button: 0,
      clientX: 100,
      clientY: 200,
      preventDefault: vi.fn(),
    } as unknown as React.MouseEvent;

    act(() => {
      result.current.onMouseDown(mouseEvent);
    });

    act(() => {
      vi.advanceTimersByTime(999);
    });

    expect(onLongPress).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(1);
    });

    expect(onLongPress).toHaveBeenCalledTimes(1);
  });

  it("デフォルトdelayが500msであること", () => {
    const { result } = renderHook(() => createUseLongPress({ onLongPress }));

    const mouseEvent = {
      button: 0,
      clientX: 100,
      clientY: 200,
      preventDefault: vi.fn(),
    } as unknown as React.MouseEvent;

    act(() => {
      result.current.onMouseDown(mouseEvent);
    });

    act(() => {
      vi.advanceTimersByTime(499);
    });

    expect(onLongPress).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(1);
    });

    expect(onLongPress).toHaveBeenCalledTimes(1);
  });

  it("デフォルトthresholdが10pxであること", () => {
    const { result } = renderHook(() => createUseLongPress({ onLongPress }));

    const touchStartEvent = {
      touches: [{ clientX: 100, clientY: 200 }],
      preventDefault: vi.fn(),
    } as unknown as React.TouchEvent;

    const touchMoveEvent = {
      touches: [{ clientX: 110, clientY: 200 }], // 10px移動
      preventDefault: vi.fn(),
    } as unknown as React.TouchEvent;

    act(() => {
      result.current.onTouchStart(touchStartEvent);
    });

    act(() => {
      result.current.onTouchMove(touchMoveEvent);
    });

    expect(result.current.isPressed).toBe(true); // 10pxちょうどなのでキャンセルされない

    const touchMoveEvent2 = {
      touches: [{ clientX: 111, clientY: 200 }], // 11px移動
      preventDefault: vi.fn(),
    } as unknown as React.TouchEvent;

    act(() => {
      result.current.onTouchMove(touchMoveEvent2);
    });

    expect(result.current.isPressed).toBe(false); // 閾値を超えたのでキャンセル
  });
});

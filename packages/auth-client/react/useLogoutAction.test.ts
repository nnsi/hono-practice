import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { useLogoutAction } from "./useLogoutAction";

describe("useLogoutAction", () => {
  it("初期状態: warning=false, pending=false", () => {
    const onLogout = vi.fn().mockResolvedValue({ ok: true });
    const { result } = renderHook(() => useLogoutAction(onLogout));

    expect(result.current.warning).toBe(false);
    expect(result.current.pending).toBe(false);
  });

  it("logout 成功時: warning は false のまま, onSuccess が呼ばれる", async () => {
    const onLogout = vi.fn().mockResolvedValue({ ok: true });
    const onSuccess = vi.fn();
    const { result } = renderHook(() => useLogoutAction(onLogout, onSuccess));

    await act(async () => {
      await result.current.trigger();
    });

    expect(result.current.warning).toBe(false);
    expect(onSuccess).toHaveBeenCalledTimes(1);
  });

  it("logout 失敗時 ({ ok: false }): warning=true, onSuccess は呼ばれない", async () => {
    const onLogout = vi.fn().mockResolvedValue({ ok: false });
    const onSuccess = vi.fn();
    const { result } = renderHook(() => useLogoutAction(onLogout, onSuccess));

    await act(async () => {
      await result.current.trigger();
    });

    expect(result.current.warning).toBe(true);
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it("失敗 -> 成功 の順で trigger すると warning は false に戻る (再試行成功シナリオ)", async () => {
    const onLogout = vi
      .fn()
      .mockResolvedValueOnce({ ok: false })
      .mockResolvedValueOnce({ ok: true });
    const { result } = renderHook(() => useLogoutAction(onLogout));

    await act(async () => {
      await result.current.trigger();
    });
    expect(result.current.warning).toBe(true);

    await act(async () => {
      await result.current.trigger();
    });
    expect(result.current.warning).toBe(false);
  });

  it("dismissWarning は warning を false に戻す", async () => {
    const onLogout = vi.fn().mockResolvedValue({ ok: false });
    const { result } = renderHook(() => useLogoutAction(onLogout));

    await act(async () => {
      await result.current.trigger();
    });
    expect(result.current.warning).toBe(true);

    act(() => {
      result.current.dismissWarning();
    });
    expect(result.current.warning).toBe(false);
  });

  it("trigger 中は pending=true, 完了後 false", async () => {
    let resolveLogout: (v: { ok: boolean }) => void = () => {};
    const onLogout = vi.fn(
      () =>
        new Promise<{ ok: boolean }>((resolve) => {
          resolveLogout = resolve;
        }),
    );
    const { result } = renderHook(() => useLogoutAction(onLogout));

    act(() => {
      void result.current.trigger();
    });
    expect(result.current.pending).toBe(true);

    await act(async () => {
      resolveLogout({ ok: true });
    });
    expect(result.current.pending).toBe(false);
  });
});

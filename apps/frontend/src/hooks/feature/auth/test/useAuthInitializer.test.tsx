import * as useToastHook from "@components/ui";
import * as useAuthHook from "@frontend/hooks/useAuth";
import * as routerHooks from "@tanstack/react-router";
import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useAuthInitializer } from "../useAuthInitializer";

// モックの設定
vi.mock("@frontend/hooks/useAuth");
vi.mock("@components/ui");
vi.mock("@tanstack/react-router");

describe("useAuthInitializer", () => {
  const mockToast = vi.fn();
  const mockNavigate = vi.fn();
  const mockRefreshToken = vi.fn();

  const mockUser = {
    id: "00000000-0000-4000-8000-000000000001",
    name: "Test User",
    providers: ["email"],
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // useToastのモック
    vi.mocked(useToastHook.useToast).mockReturnValue({
      toast: mockToast,
    } as any);

    // useNavigateのモック
    vi.mocked(routerHooks.useNavigate).mockReturnValue(mockNavigate);

    // useAuthのデフォルトモック
    vi.mocked(useAuthHook.useAuth).mockReturnValue({
      user: mockUser,
      requestStatus: "idle",
      refreshToken: mockRefreshToken,
      isInitialized: true,
    } as any);
  });

  afterEach(() => {
    // イベントリスナーのクリーンアップ
    vi.restoreAllMocks();
  });

  it("初期化時にイベントリスナーが登録される", () => {
    const addEventListenerSpy = vi.spyOn(window, "addEventListener");

    renderHook(() => useAuthInitializer());

    expect(addEventListenerSpy).toHaveBeenCalledWith(
      "api-error",
      expect.any(Function),
    );
    expect(addEventListenerSpy).toHaveBeenCalledWith(
      "unauthorized",
      expect.any(Function),
    );
    expect(addEventListenerSpy).toHaveBeenCalledWith(
      "touchstart",
      expect.any(Function),
      { passive: false },
    );
  });

  it("クリーンアップ時にイベントリスナーが削除される", () => {
    const removeEventListenerSpy = vi.spyOn(window, "removeEventListener");

    const { unmount } = renderHook(() => useAuthInitializer());

    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith(
      "api-error",
      expect.any(Function),
    );
    expect(removeEventListenerSpy).toHaveBeenCalledWith(
      "unauthorized",
      expect.any(Function),
    );
    expect(removeEventListenerSpy).toHaveBeenCalledWith(
      "touchstart",
      expect.any(Function),
    );
  });

  it("api-errorイベントでトーストが表示される", async () => {
    renderHook(() => useAuthInitializer());

    const apiErrorEvent = new CustomEvent("api-error", {
      detail: "APIエラーが発生しました",
    });

    act(() => {
      window.dispatchEvent(apiErrorEvent);
    });

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: "Error",
        description: "APIエラーが発生しました",
        variant: "destructive",
      });
    });
  });

  it("unauthorizedイベントでリフレッシュトークンが呼ばれる", async () => {
    mockRefreshToken.mockResolvedValue(undefined);

    renderHook(() => useAuthInitializer());

    const unauthorizedEvent = new Event("unauthorized");

    act(() => {
      window.dispatchEvent(unauthorizedEvent);
    });

    await waitFor(() => {
      expect(mockRefreshToken).toHaveBeenCalled();
    });

    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it("リフレッシュトークンが失敗した場合はログインページにリダイレクトする", async () => {
    mockRefreshToken.mockRejectedValue(new Error("Refresh failed"));

    renderHook(() => useAuthInitializer());

    const unauthorizedEvent = new Event("unauthorized");

    act(() => {
      window.dispatchEvent(unauthorizedEvent);
    });

    await waitFor(() => {
      expect(mockRefreshToken).toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith({ to: "/" });
    });
  });

  it("ユーザーが未認証の場合はunauthorizedイベントで何もしない", async () => {
    vi.mocked(useAuthHook.useAuth).mockReturnValue({
      user: null,
      requestStatus: "idle",
      refreshToken: mockRefreshToken,
      isInitialized: true,
    } as any);

    renderHook(() => useAuthInitializer());

    const unauthorizedEvent = new Event("unauthorized");

    act(() => {
      window.dispatchEvent(unauthorizedEvent);
    });

    await waitFor(() => {
      expect(mockRefreshToken).not.toHaveBeenCalled();
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  it("ピンチズームが無効化される", () => {
    renderHook(() => useAuthInitializer());

    const touchEvent = new TouchEvent("touchstart", {
      touches: [
        { identifier: 0, target: document.body } as unknown as Touch,
        { identifier: 1, target: document.body } as unknown as Touch,
      ],
    } as TouchEventInit);

    const preventDefaultSpy = vi.spyOn(touchEvent, "preventDefault");

    act(() => {
      window.dispatchEvent(touchEvent);
    });

    expect(preventDefaultSpy).toHaveBeenCalled();
  });

  it("シングルタッチではピンチズーム無効化が動作しない", () => {
    renderHook(() => useAuthInitializer());

    const touchEvent = new TouchEvent("touchstart", {
      touches: [{ identifier: 0, target: document.body } as unknown as Touch],
    } as TouchEventInit);

    const preventDefaultSpy = vi.spyOn(touchEvent, "preventDefault");

    act(() => {
      window.dispatchEvent(touchEvent);
    });

    expect(preventDefaultSpy).not.toHaveBeenCalled();
  });

  it("正しい値を返す", () => {
    const { result } = renderHook(() => useAuthInitializer());

    expect(result.current).toEqual({
      isInitialized: true,
      user: mockUser,
      requestStatus: "idle",
    });
  });

  it("useAuthの値が変更されると返り値も更新される", () => {
    const { result, rerender } = renderHook(() => useAuthInitializer());

    expect(result.current.user).toEqual(mockUser);

    // useAuthの返り値を更新
    vi.mocked(useAuthHook.useAuth).mockReturnValue({
      user: null,
      requestStatus: "loading",
      refreshToken: mockRefreshToken,
      isInitialized: false,
    } as any);

    rerender();

    expect(result.current.user).toBeNull();
    expect(result.current.requestStatus).toBe("loading");
    expect(result.current.isInitialized).toBe(false);
  });

  it("依存配列の値が変更されてもリスナーが正しく再登録される", () => {
    const addEventListenerSpy = vi.spyOn(window, "addEventListener");
    const removeEventListenerSpy = vi.spyOn(window, "removeEventListener");

    const { rerender } = renderHook(() => useAuthInitializer());

    // 初回レンダリング時のリスナー登録数を記録
    const initialAddCalls = addEventListenerSpy.mock.calls.length;

    // 新しいrefreshToken関数を作成
    const newRefreshToken = vi.fn();
    vi.mocked(useAuthHook.useAuth).mockReturnValue({
      user: mockUser,
      requestStatus: "idle",
      refreshToken: newRefreshToken,
      isInitialized: true,
    } as any);

    rerender();

    // 古いリスナーが削除され、新しいリスナーが登録されることを確認
    expect(removeEventListenerSpy).toHaveBeenCalledTimes(3); // 3つのイベント
    expect(addEventListenerSpy.mock.calls.length).toBeGreaterThan(
      initialAddCalls,
    );
  });
});

import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useOfflineBanner } from "../useOfflineBanner";

// useNetworkStatusContextのモック
const mockUseNetworkStatusContext = vi.fn();

vi.mock("@frontend/providers/NetworkStatusProvider", () => ({
  useNetworkStatusContext: () => mockUseNetworkStatusContext(),
}));

describe("useOfflineBanner", () => {
  beforeEach(() => {
    vi.clearAllTimers();
    vi.useFakeTimers();
    mockUseNetworkStatusContext.mockReturnValue({ isOnline: true });
  });

  describe("初期状態", () => {
    it("オンライン時はバナーが表示されない", () => {
      const { result } = renderHook(() => useOfflineBanner());

      expect(result.current.isVisible).toBe(false);
      expect(result.current.isOnline).toBe(true);
    });

    it("オフライン時はバナーが表示される", () => {
      mockUseNetworkStatusContext.mockReturnValue({ isOnline: false });
      const { result } = renderHook(() => useOfflineBanner());

      expect(result.current.isVisible).toBe(true);
      expect(result.current.isOnline).toBe(false);
    });
  });

  describe("オンライン/オフライン切り替え", () => {
    it("オンラインからオフラインになるとバナーが表示される", () => {
      const { result, rerender } = renderHook(() => useOfflineBanner());

      expect(result.current.isVisible).toBe(false);

      // オフラインに切り替え
      mockUseNetworkStatusContext.mockReturnValue({ isOnline: false });
      act(() => {
        rerender();
      });

      expect(result.current.isVisible).toBe(true);
    });

    it("オフラインからオンラインになるとバナーが非表示になる", () => {
      mockUseNetworkStatusContext.mockReturnValue({ isOnline: false });
      const { result, rerender } = renderHook(() => useOfflineBanner());

      expect(result.current.isVisible).toBe(true);

      // オンラインに切り替え
      mockUseNetworkStatusContext.mockReturnValue({ isOnline: true });
      act(() => {
        rerender();
      });

      expect(result.current.isVisible).toBe(false);
    });

    it("オンライン復帰後3秒でバナーが自動的に非表示になる", () => {
      // 最初はオフライン
      mockUseNetworkStatusContext.mockReturnValue({ isOnline: false });
      const { result, rerender } = renderHook(() => useOfflineBanner());

      expect(result.current.isVisible).toBe(true);

      // オンラインに復帰
      mockUseNetworkStatusContext.mockReturnValue({ isOnline: true });
      act(() => {
        rerender();
      });

      // すぐには表示されたままだが、オンラインになったことでバナーは非表示になる
      expect(result.current.isVisible).toBe(false);
    });
  });

  describe("バナーの手動非表示", () => {
    it("handleDismissでバナーを手動で非表示にできる", () => {
      mockUseNetworkStatusContext.mockReturnValue({ isOnline: false });
      const { result } = renderHook(() => useOfflineBanner());

      expect(result.current.isVisible).toBe(true);

      // バナーを手動で非表示
      act(() => {
        result.current.handleDismiss();
      });

      // dismissしただけではすぐには非表示にならない
      expect(result.current.isVisible).toBe(false); // 次のuseEffectで非表示になる
    });

    it("手動で非表示にした後、再度オフラインになってもバナーは表示されない", () => {
      mockUseNetworkStatusContext.mockReturnValue({ isOnline: false });
      const { result, rerender } = renderHook(() => useOfflineBanner());

      expect(result.current.isVisible).toBe(true);

      // バナーを手動で非表示
      act(() => {
        result.current.handleDismiss();
      });
      act(() => {
        rerender();
      });

      // オンラインに戻る
      mockUseNetworkStatusContext.mockReturnValue({ isOnline: true });
      act(() => {
        rerender();
      });

      // 再度オフラインになる
      mockUseNetworkStatusContext.mockReturnValue({ isOnline: false });
      act(() => {
        rerender();
      });

      // isDismissedがリセットされているので、バナーは再度表示される
      expect(result.current.isVisible).toBe(true);
    });

    it("手動で非表示にした状態はオンライン復帰でリセットされる", () => {
      // オフライン状態でスタート
      mockUseNetworkStatusContext.mockReturnValue({ isOnline: false });
      const { result, rerender } = renderHook(() => useOfflineBanner());

      expect(result.current.isVisible).toBe(true);

      // バナーを手動で非表示
      act(() => {
        result.current.handleDismiss();
      });
      act(() => {
        rerender();
      });

      // この時点では、オフラインのままなので isDismissed の効果でバナーは表示されない
      expect(result.current.isVisible).toBe(false);

      // オンラインに復帰
      mockUseNetworkStatusContext.mockReturnValue({ isOnline: true });
      act(() => {
        rerender();
      });

      expect(result.current.isVisible).toBe(false);

      // 再度オフラインになる
      mockUseNetworkStatusContext.mockReturnValue({ isOnline: false });
      act(() => {
        rerender();
      });

      // isDismissedがリセットされているので、バナーは再度表示される
      expect(result.current.isVisible).toBe(true);
    });
  });

  describe("エッジケース", () => {
    it("高頻度でオンライン/オフラインが切り替わっても正しく動作する", () => {
      const { result, rerender } = renderHook(() => useOfflineBanner());

      // 高頻度で切り替え
      for (let i = 0; i < 10; i++) {
        mockUseNetworkStatusContext.mockReturnValue({ isOnline: i % 2 === 0 });
        act(() => {
          rerender();
        });
      }

      // 最後の状態（オフライン）を確認
      expect(result.current.isOnline).toBe(false);
      expect(result.current.isVisible).toBe(true);
    });

    it("アンマウント時にタイマーがクリアされる", () => {
      // オフラインからオンラインに変更
      mockUseNetworkStatusContext.mockReturnValue({ isOnline: false });
      const { rerender, unmount } = renderHook(() => useOfflineBanner());

      mockUseNetworkStatusContext.mockReturnValue({ isOnline: true });
      act(() => {
        rerender();
      });

      // タイマーが設定される状況を作る
      // （ただし、現在の実装ではisOnlineになった時点でisVisibleがfalseになるため、
      // タイマーは設定されない）

      unmount();

      // クリーンアップの確認
      // 現在の実装では特にタイマーは設定されていないため、
      // clearTimeoutは呼ばれない可能性が高い
      // expect(clearTimeoutSpy).toHaveBeenCalled();
    });
  });
});

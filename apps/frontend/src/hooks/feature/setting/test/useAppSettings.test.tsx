import { createMockStorage } from "@frontend/test-utils";
import { defaultSettings } from "@frontend/types/settings";
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useAppSettings } from "../useAppSettings";

describe("useAppSettings", () => {
  let mockStorage: ReturnType<typeof createMockStorage>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockStorage = createMockStorage();
    Object.defineProperty(window, "localStorage", {
      value: mockStorage,
      writable: true,
    });
  });

  describe("初期設定", () => {
    it("デフォルト設定を返す", async () => {
      const { result } = renderHook(() => useAppSettings());

      await waitFor(() => {
        expect(result.current.isLoaded).toBe(true);
      });

      expect(result.current.settings).toEqual(defaultSettings);
    });

    it("localStorageから設定を読み込む", async () => {
      const savedSettings = {
        showGoalOnStartup: true,
        hideGoalGraph: true,
        showInactiveDates: false,
      };
      mockStorage.setItem("actiko_app_settings", JSON.stringify(savedSettings));

      const { result } = renderHook(() => useAppSettings());

      await waitFor(() => {
        expect(result.current.isLoaded).toBe(true);
      });

      expect(result.current.settings).toEqual(savedSettings);
    });

    it("不正なlocalStorageデータの場合はデフォルト設定を使用", async () => {
      mockStorage.setItem("actiko_app_settings", "invalid json");

      const { result } = renderHook(() => useAppSettings());

      await waitFor(() => {
        expect(result.current.isLoaded).toBe(true);
      });

      expect(result.current.settings).toEqual(defaultSettings);
    });
  });

  describe("設定の更新", () => {
    it("設定を更新できる", async () => {
      const { result } = renderHook(() => useAppSettings());

      await waitFor(() => {
        expect(result.current.isLoaded).toBe(true);
      });

      // act内でstate更新を実行
      act(() => {
        result.current.updateSetting("showGoalOnStartup", true);
      });

      expect(result.current.settings.showGoalOnStartup).toBe(true);
    });

    it("設定の更新がlocalStorageに保存される", async () => {
      const { result } = renderHook(() => useAppSettings());

      await waitFor(() => {
        expect(result.current.isLoaded).toBe(true);
      });

      // act内でstate更新を実行
      await act(async () => {
        result.current.updateSetting("hideGoalGraph", true);
      });

      await waitFor(() => {
        const saved = JSON.parse(
          mockStorage.getItem("actiko_app_settings") || "{}",
        );
        expect(saved.hideGoalGraph).toBe(true);
      });
    });

    it("複数の設定を個別に更新できる", async () => {
      const { result } = renderHook(() => useAppSettings());

      await waitFor(() => {
        expect(result.current.isLoaded).toBe(true);
      });

      // act内でstate更新を実行（非同期処理）
      await act(async () => {
        await result.current.updateSetting("showGoalOnStartup", true);
        await result.current.updateSetting("showInactiveDates", true);
      });

      expect(result.current.settings).toEqual({
        showGoalOnStartup: true,
        hideGoalGraph: false,
        showInactiveDates: true,
      });
    });
  });

  describe("エラーハンドリング", () => {
    it("localStorage読み込みエラー時はデフォルト設定を使用", () => {
      const consoleErrorSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});
      mockStorage.getItem = vi.fn(() => {
        throw new Error("Storage error");
      });

      const { result } = renderHook(() => useAppSettings());

      expect(result.current.settings).toEqual(defaultSettings);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Failed to get item from localStorage:",
        expect.any(Error),
      );
    });

    it("localStorage保存エラー時もアプリは動作を続ける", async () => {
      const consoleErrorSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});
      mockStorage.setItem = vi.fn(() => {
        throw new Error("Storage error");
      });

      const { result } = renderHook(() => useAppSettings());

      await waitFor(() => {
        expect(result.current.isLoaded).toBe(true);
      });

      // エラーが発生してもクラッシュしない
      await act(async () => {
        expect(() => {
          result.current.updateSetting("showGoalOnStartup", true);
        }).not.toThrow();
      });

      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          "Failed to save settings:",
          expect.any(Error),
        );
      });

      consoleErrorSpy.mockRestore();
    });
  });

  describe("hookの安定性", () => {
    it("updateSetting関数は再レンダリング時も同じ参照を保つ", async () => {
      const { result, rerender } = renderHook(() => useAppSettings());

      await waitFor(() => {
        expect(result.current.isLoaded).toBe(true);
      });

      const initialUpdateSetting = result.current.updateSetting;

      rerender();

      expect(result.current.updateSetting).toBe(initialUpdateSetting);
    });
  });
});

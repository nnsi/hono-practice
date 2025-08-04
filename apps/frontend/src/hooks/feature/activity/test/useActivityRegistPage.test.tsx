import type React from "react";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { GetActivityResponse } from "@dtos/response";

import { useActivityRegistPage } from "../useActivityRegistPage";

// useGlobalDateのモック
const mockDate = new Date("2025-01-20");
const mockSetDate = vi.fn();
vi.mock("@frontend/hooks", () => ({
  useGlobalDate: () => ({
    date: mockDate,
    setDate: mockSetDate,
  }),
}));

// useActivityBatchDataのモック
const mockActivities: GetActivityResponse[] = [
  {
    id: "activity-1",
    name: "ランニング",
    description: "毎日のランニング",
    quantityUnit: "分",
    emoji: "🏃",
    iconType: "emoji",
    showCombinedStats: false,
    kinds: [],
  },
  {
    id: "activity-2",
    name: "読書",
    description: "読書時間",
    quantityUnit: "ページ",
    emoji: "📚",
    iconType: "emoji",
    showCombinedStats: false,
    kinds: [],
  },
];

const mockHasActivityLogs = {
  "activity-1": true,
  "activity-2": false,
};

vi.mock("@frontend/hooks/api", () => ({
  useActivityBatchData: () => ({
    activities: mockActivities,
    hasActivityLogs: mockHasActivityLogs,
  }),
}));

describe("useActivityRegistPage", () => {
  let queryClient: QueryClient;

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
  });

  describe("初期状態", () => {
    it("初期状態が正しく設定される", () => {
      const { result } = renderHook(() => useActivityRegistPage(), {
        wrapper,
      });

      expect(result.current.date).toEqual(mockDate);
      expect(result.current.activities).toEqual(mockActivities);
      expect(result.current.hasActivityLogs).toEqual(mockHasActivityLogs);
      expect(result.current.open).toBe(false);
      expect(result.current.selectedActivity).toBe(null);
      expect(result.current.editModalOpen).toBe(false);
      expect(result.current.editTargetActivity).toBe(null);
    });
  });

  describe("アクティビティクリック", () => {
    it("アクティビティをクリックすると選択されてダイアログが開く", () => {
      const { result } = renderHook(() => useActivityRegistPage(), {
        wrapper,
      });

      act(() => {
        result.current.handleActivityClick(mockActivities[0]);
      });

      expect(result.current.selectedActivity).toEqual(mockActivities[0]);
      expect(result.current.open).toBe(true);
    });
  });

  describe("新規アクティビティ", () => {
    it("新規アクティビティボタンをクリックするとダイアログが開く", () => {
      const { result } = renderHook(() => useActivityRegistPage(), {
        wrapper,
      });

      act(() => {
        result.current.handleNewActivityClick();
      });

      expect(result.current.open).toBe(true);
      expect(result.current.selectedActivity).toBe(null);
    });
  });

  describe("編集モーダル", () => {
    it("編集ボタンをクリックすると編集モーダルが開く", () => {
      const { result } = renderHook(() => useActivityRegistPage(), {
        wrapper,
      });

      act(() => {
        result.current.handleEditClick(mockActivities[1]);
      });

      expect(result.current.editTargetActivity).toEqual(mockActivities[1]);
      expect(result.current.editModalOpen).toBe(true);
    });

    it("編集モーダルを閉じることができる", () => {
      const { result } = renderHook(() => useActivityRegistPage(), {
        wrapper,
      });

      act(() => {
        result.current.handleEditClick(mockActivities[1]);
      });

      act(() => {
        result.current.handleActivityEditDialogClose();
      });

      expect(result.current.editModalOpen).toBe(false);
    });
  });

  describe("新規アクティビティダイアログ", () => {
    it("ダイアログの開閉状態を変更できる", () => {
      const { result } = renderHook(() => useActivityRegistPage(), {
        wrapper,
      });

      act(() => {
        result.current.handleNewActivityDialogChange(true);
      });
      expect(result.current.open).toBe(true);

      act(() => {
        result.current.handleNewActivityDialogChange(false);
      });
      expect(result.current.open).toBe(false);
    });
  });

  describe("アクティビティログ作成ダイアログ", () => {
    it.skip("ダイアログを閉じるとキャッシュが無効化される - sync機能削除のためスキップ", async () => {
      const invalidateQueriesSpy = vi.spyOn(queryClient, "invalidateQueries");
      const { result } = renderHook(() => useActivityRegistPage(), {
        wrapper,
      });

      // ダイアログを開く
      act(() => {
        result.current.handleActivityClick(mockActivities[0]);
      });

      // ダイアログを閉じる
      await act(async () => {
        await result.current.handleActivityLogCreateDialogChange(false);
      });

      await waitFor(() => {
        expect(result.current.open).toBe(false);
        expect(result.current.selectedActivity).toBe(null);
        expect(invalidateQueriesSpy).toHaveBeenCalledWith({
          queryKey: ["activity", "activity-logs-daily", "2025-01-20"],
        });
        expect(invalidateQueriesSpy).toHaveBeenCalledWith({
          queryKey: ["activity-logs-daily", "2025-01-20"],
        });
      });
    });

    it("ダイアログを開くときはキャッシュは無効化されない", async () => {
      const invalidateQueriesSpy = vi.spyOn(queryClient, "invalidateQueries");
      const { result } = renderHook(() => useActivityRegistPage(), {
        wrapper,
      });

      await act(async () => {
        await result.current.handleActivityLogCreateDialogChange(true);
      });

      expect(result.current.open).toBe(true);
      expect(invalidateQueriesSpy).not.toHaveBeenCalled();
    });
  });

  describe("アクティビティログ作成成功", () => {
    it("成功時にキャッシュが無効化される", async () => {
      const invalidateQueriesSpy = vi.spyOn(queryClient, "invalidateQueries");
      const { result } = renderHook(() => useActivityRegistPage(), {
        wrapper,
      });

      act(() => {
        result.current.handleActivityLogCreateSuccess();
      });

      await waitFor(() => {
        expect(invalidateQueriesSpy).toHaveBeenCalledWith({
          queryKey: ["activity", "activity-logs-daily", "2025-01-20"],
        });
        expect(invalidateQueriesSpy).toHaveBeenCalledWith({
          queryKey: ["activity-logs-daily", "2025-01-20"],
        });
      });
    });
  });

  describe("キャッシュ無効化", () => {
    it.skip("複数のクエリキーが同時に無効化される - sync機能削除のためスキップ", async () => {
      const invalidateQueriesSpy = vi.spyOn(queryClient, "invalidateQueries");
      const { result } = renderHook(() => useActivityRegistPage(), {
        wrapper,
      });

      // アクティビティを選択してダイアログを開く
      act(() => {
        result.current.handleActivityClick(mockActivities[0]);
      });

      // ダイアログを閉じる（キャッシュ無効化が発生）
      await act(async () => {
        await result.current.handleActivityLogCreateDialogChange(false);
      });

      await waitFor(() => {
        expect(invalidateQueriesSpy).toHaveBeenCalledTimes(3);

        // 3つのクエリキーが無効化されることを確認
        const calls = invalidateQueriesSpy.mock.calls;
        const queryKeys = calls
          .map((call) => call[0]?.queryKey)
          .filter(Boolean);

        expect(queryKeys).toContainEqual(["activity"]);
        expect(queryKeys).toContainEqual([
          "activity",
          "activity-logs-daily",
          "2025-01-20",
        ]);
        expect(queryKeys).toContainEqual(["activity-logs-daily", "2025-01-20"]);
      });
    });
  });

  describe("統合シナリオ", () => {
    it.skip("アクティビティを選択、ログを作成、ダイアログを閉じる一連の流れ - sync機能削除のためスキップ", async () => {
      const invalidateQueriesSpy = vi.spyOn(queryClient, "invalidateQueries");
      const { result } = renderHook(() => useActivityRegistPage(), {
        wrapper,
      });

      // 1. アクティビティを選択
      act(() => {
        result.current.handleActivityClick(mockActivities[0]);
      });
      expect(result.current.selectedActivity).toEqual(mockActivities[0]);
      expect(result.current.open).toBe(true);

      // 2. ログ作成成功をシミュレート
      act(() => {
        result.current.handleActivityLogCreateSuccess();
      });

      // 3. ダイアログを閉じる
      await act(async () => {
        await result.current.handleActivityLogCreateDialogChange(false);
      });

      await waitFor(() => {
        // 最終状態の確認
        expect(result.current.open).toBe(false);
        expect(result.current.selectedActivity).toBe(null);

        // キャッシュ無効化が2回（成功時と閉じる時）呼ばれる
        // 各回で3つのクエリキーが無効化される
        expect(invalidateQueriesSpy).toHaveBeenCalledTimes(6); // 3つのクエリキー × 2回
      });
    });
  });
});

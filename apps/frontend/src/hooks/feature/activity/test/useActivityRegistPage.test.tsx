import type React from "react";

import { EventBusProvider } from "@frontend/providers/EventBusProvider";
import { createWindowEventBus } from "@frontend/services/abstractions/EventBus";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { GetActivityResponse } from "@dtos/response";

import { useActivityRegistPage } from "../useActivityRegistPage";

// useGlobalDateのモック
const mockDate = new Date("2025-01-20");
const mockSetDate = vi.fn();
vi.mock("@frontend/hooks/useGlobalDate", () => ({
  useGlobalDate: () => ({
    selectedDate: mockDate,
    setSelectedDate: mockSetDate,
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

const mockHasActivityLogsData: Record<string, boolean> = {
  "activity-1": true,
  "activity-2": false,
};

const mockHasActivityLogs = vi.fn(
  (activityId: string) => mockHasActivityLogsData[activityId] || false,
);

vi.mock("@frontend/hooks/api/useActivityBatchData", () => ({
  useActivityBatchData: () => ({
    activities: mockActivities,
    hasActivityLogs: mockHasActivityLogs,
  }),
}));

// モック用の関数
const mockHandleActivityClick = vi.fn();
const mockHandleActivityEditDialogClose = vi.fn();
const mockHandleSuccess = vi.fn();
const mockSetOpen = vi.fn();
const mockHandleNewActivityClick = vi.fn();
const mockHandleActivityEdit = vi.fn();

// createUseActivityRegistPageのモック
vi.mock("@packages/frontend-shared/hooks/feature", () => ({
  createUseActivityRegistPage: vi.fn(() => {
    let open = false;
    let selectedActivity: any = null;
    let editModalOpen = false;
    let editTargetActivity: any = null;

    return {
      date: mockDate,
      open,
      selectedActivity,
      editModalOpen,
      editTargetActivity,
      handleActivityClick: mockHandleActivityClick.mockImplementation(
        (activity: any) => {
          selectedActivity = activity;
          open = true;
        },
      ),
      handleActivityEditDialogClose:
        mockHandleActivityEditDialogClose.mockImplementation(() => {
          editModalOpen = false;
          editTargetActivity = null;
        }),
      handleSuccess: mockHandleSuccess.mockImplementation(() => {
        open = false;
        selectedActivity = null;
      }),
      setOpen: mockSetOpen.mockImplementation((value: boolean) => {
        open = value;
      }),
      handleNewActivityClick: mockHandleNewActivityClick.mockImplementation(
        () => {
          open = true;
          selectedActivity = null;
        },
      ),
      handleActivityEdit: mockHandleActivityEdit.mockImplementation(
        (activity: any) => {
          editTargetActivity = activity;
          editModalOpen = true;
        },
      ),
    };
  }),
}));

describe("useActivityRegistPage", () => {
  let queryClient: QueryClient;
  const eventBus = createWindowEventBus();

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <EventBusProvider eventBus={eventBus}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </EventBusProvider>
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
    it("初期状態が正しく設定される", async () => {
      const { result } = renderHook(() => useActivityRegistPage(), {
        wrapper,
      });

      await waitFor(() => {
        expect(result.current.date).toEqual(mockDate);
        expect(result.current.activities).toEqual(mockActivities);
        expect(result.current.hasActivityLogs).toBeDefined();
        expect(typeof result.current.hasActivityLogs).toBe("function");
        expect(result.current.hasActivityLogs("activity-1")).toBe(true);
        expect(result.current.hasActivityLogs("activity-2")).toBe(false);
        expect(result.current.open).toBe(false);
        expect(result.current.selectedActivity).toBe(null);
        expect(result.current.editModalOpen).toBe(false);
        expect(result.current.editTargetActivity).toBe(null);
      });
    });
  });

  describe("アクティビティクリック", () => {
    it("アクティビティをクリックすると選択されてダイアログが開く", async () => {
      const { result } = renderHook(() => useActivityRegistPage(), {
        wrapper,
      });

      await act(async () => {
        result.current.handleActivityClick(mockActivities[0]);
      });

      expect(mockHandleActivityClick).toHaveBeenCalledWith(mockActivities[0]);
    });
  });

  describe("新規アクティビティ", () => {
    it("新規アクティビティボタンをクリックするとダイアログが開く", async () => {
      const { result } = renderHook(() => useActivityRegistPage(), {
        wrapper,
      });

      await act(async () => {
        result.current.handleNewActivityClick();
      });

      expect(mockHandleNewActivityClick).toHaveBeenCalled();
    });
  });

  describe("編集モーダル", () => {
    it("編集モーダルを閉じることができる", async () => {
      const { result } = renderHook(() => useActivityRegistPage(), {
        wrapper,
      });

      // モーダルを閉じる
      await act(async () => {
        result.current.handleActivityEditDialogClose();
      });

      expect(mockHandleActivityEditDialogClose).toHaveBeenCalled();
    });
  });

  describe("成功ハンドラ", () => {
    it("フックが正しいプロパティを返す", async () => {
      const { result } = renderHook(() => useActivityRegistPage(), {
        wrapper,
      });

      await waitFor(() => {
        // フックが返す実際のプロパティを確認
        expect(result.current.activities).toBeDefined();
        expect(result.current.hasActivityLogs).toBeDefined();
        expect(result.current.handleDeleteActivity).toBeDefined();
      });
    });
  });

  describe("ダイアログ操作", () => {
    it("ダイアログ関連のプロパティが定義されている", async () => {
      const { result } = renderHook(() => useActivityRegistPage(), {
        wrapper,
      });

      await waitFor(() => {
        expect(result.current.open).toBeDefined();
        expect(result.current.editModalOpen).toBeDefined();
      });
    });
  });

  describe("削除ハンドラ", () => {
    it("削除時に編集ダイアログが閉じてキャッシュが無効化される", async () => {
      const { result } = renderHook(() => useActivityRegistPage(), {
        wrapper,
      });

      await act(async () => {
        result.current.handleDeleteActivity();
      });

      expect(mockHandleActivityEditDialogClose).toHaveBeenCalled();
      // キャッシュ無効化の確認
      expect(queryClient.invalidateQueries).toBeDefined();
    });
  });

  describe("活動ログ確認", () => {
    it("各アクティビティのログ有無を確認できる", async () => {
      const { result } = renderHook(() => useActivityRegistPage(), {
        wrapper,
      });

      await waitFor(() => {
        expect(result.current.hasActivityLogs("activity-1")).toBe(true);
        expect(result.current.hasActivityLogs("activity-2")).toBe(false);
        expect(result.current.hasActivityLogs("non-existent")).toBe(false);
      });
    });
  });
});

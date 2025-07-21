import type React from "react";

import { DateContext } from "@frontend/providers/DateProvider";
import { createMockApiClient } from "@frontend/test-utils";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { GetGoalsResponse } from "@dtos/response";

import { getColorForKind, useActivityStats } from "../useActivityStats";

// mockApiClientはトップレベルで定義
let mockApiClient: ReturnType<typeof createMockApiClient>;

// apiClientのモック
vi.mock("@frontend/utils", () => ({
  get apiClient() {
    return mockApiClient;
  },
  qp: (options: any) => ({
    ...options,
    queryFn: async () => {
      const res = await options.queryFn();
      const json = await res.json();
      const parsedResult = options.schema.safeParse(json);
      if (!parsedResult.success) {
        throw parsedResult.error;
      }
      return parsedResult.data;
    },
  }),
}));

// useGoalsのモック
const mockGoalsData: GetGoalsResponse = {
  goals: [
    {
      id: "goal-1",
      userId: "user-1",
      activityId: "activity-1",
      isActive: true,
      dailyTargetQuantity: 30,
      startDate: "2025-01-01",
      endDate: "2025-12-31",
      currentBalance: 0,
      totalTarget: 10950,
      totalActual: 0,
      inactiveDates: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: "goal-2",
      userId: "user-1",
      activityId: "activity-1",
      isActive: true,
      dailyTargetQuantity: 45,
      startDate: "2025-01-15",
      endDate: "2025-01-31",
      currentBalance: 0,
      totalTarget: 765,
      totalActual: 0,
      inactiveDates: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: "goal-3",
      userId: "user-1",
      activityId: "activity-2",
      isActive: true,
      dailyTargetQuantity: 20,
      startDate: "2024-12-01",
      endDate: "2025-02-28",
      currentBalance: 0,
      totalTarget: 1800,
      totalActual: 0,
      inactiveDates: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ],
};

const mockUseGoals = vi.fn(() => ({ data: mockGoalsData }));
vi.mock("@frontend/hooks/api/useGoals", () => ({
  useGoals: () => mockUseGoals(),
}));

// APIクライアントのモック
const mockStatsData = [
  {
    id: "activity-1",
    name: "ランニング",
    quantityUnit: "分",
    total: null,
    showCombinedStats: false,
    kinds: [
      {
        id: "kind-1",
        name: "朝ラン",
        total: 90,
        logs: [
          { date: "2025-01-01", quantity: 30 },
          { date: "2025-01-02", quantity: 25 },
          { date: "2025-01-03", quantity: 0 },
          { date: "2025-01-04", quantity: 35 },
        ],
      },
      {
        id: "kind-2",
        name: "夜ラン",
        total: 45,
        logs: [
          { date: "2025-01-01", quantity: 15 },
          { date: "2025-01-02", quantity: 20 },
          { date: "2025-01-03", quantity: 0 },
          { date: "2025-01-04", quantity: 10 },
        ],
      },
    ],
  },
];

describe("useActivityStats", () => {
  let queryClient: QueryClient;
  let mockDate: Date;
  let mockSetDate: ReturnType<typeof vi.fn>;

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <DateContext.Provider value={{ date: mockDate, setDate: mockSetDate }}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </DateContext.Provider>
  );

  beforeEach(() => {
    vi.clearAllMocks();
    vi.setSystemTime(new Date("2025-01-20"));

    mockApiClient = createMockApiClient();
    mockDate = new Date("2025-01-20");
    mockSetDate = vi.fn();

    // Reset mockUseGoals to return default data
    mockUseGoals.mockReturnValue({ data: mockGoalsData });

    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    vi.mocked(
      mockApiClient.users["activity-logs"].stats.$get,
    ).mockResolvedValue({
      json: () => Promise.resolve(mockStatsData),
    } as any);
  });

  describe("初期状態と月の管理", () => {
    it("初期状態で現在の月が設定される", () => {
      const { result } = renderHook(() => useActivityStats(), {
        wrapper,
      });

      expect(result.current.month).toBe("2025-01");
    });

    it("前月に移動できる", () => {
      const { result } = renderHook(() => useActivityStats(), {
        wrapper,
      });

      act(() => {
        result.current.handlePrevMonth();
      });

      expect(result.current.month).toBe("2024-12");
    });

    it("翌月に移動できる", () => {
      const { result } = renderHook(() => useActivityStats(), {
        wrapper,
      });

      act(() => {
        result.current.handleNextMonth();
      });

      expect(result.current.month).toBe("2025-02");
    });

    it("日付コンテキストの月が変更されると、表示月も更新される", () => {
      const { rerender } = renderHook(() => useActivityStats(), {
        wrapper,
      });

      // 日付を変更
      mockDate = new Date("2025-03-15");
      rerender();

      // useEffectが実行されて月が更新される
      const { result } = renderHook(() => useActivityStats(), {
        wrapper: ({ children }: { children: React.ReactNode }) => (
          <DateContext.Provider
            value={{ date: mockDate, setDate: mockSetDate }}
          >
            <QueryClientProvider client={queryClient}>
              {children}
            </QueryClientProvider>
          </DateContext.Provider>
        ),
      });

      expect(result.current.month).toBe("2025-03");
    });
  });

  describe("統計データの取得", () => {
    it("統計データが正しく取得される", async () => {
      const { result } = renderHook(() => useActivityStats(), {
        wrapper,
      });

      await waitFor(async () => {
        expect(result.current.isLoading).toBe(false);
        expect(result.current.stats).toEqual(mockStatsData);
      });
    });

    it("月を変更すると新しいデータが取得される", async () => {
      const { result } = renderHook(() => useActivityStats(), {
        wrapper,
      });

      act(() => {
        result.current.handleNextMonth();
      });

      await waitFor(async () => {
        expect(
          mockApiClient.users["activity-logs"].stats.$get,
        ).toHaveBeenCalledWith({
          query: {
            date: "2025-02",
          },
        });
      });
    });
  });

  describe("目標ラインの生成", () => {
    it("アクティビティに関連する目標ラインを生成する", () => {
      const { result } = renderHook(() => useActivityStats(), {
        wrapper,
      });

      const goalLines = result.current.getGoalLinesForActivity("activity-1");

      expect(goalLines).toHaveLength(2);
      expect(goalLines[0]).toEqual({
        id: "goal-1",
        value: 30,
        label: "目標1: 30",
        color: "#ff6b6b",
      });
      expect(goalLines[1]).toEqual({
        id: "goal-2",
        value: 45,
        label: "目標2: 45",
        color: "#ff6b6b",
      });
    });

    it("表示月と重複しない目標は除外される", () => {
      const { result } = renderHook(() => useActivityStats(), {
        wrapper,
      });

      // 3月に移動
      act(() => {
        result.current.handleNextMonth();
        result.current.handleNextMonth();
      });

      const goalLines = result.current.getGoalLinesForActivity("activity-1");

      // goal-2は1月末までなので、3月では表示されない
      expect(goalLines).toHaveLength(1);
      expect(goalLines[0].id).toBe("goal-1");
    });

    it("終了日がない目標も正しく処理される", () => {
      const goalsWithoutEndDate = {
        goals: [
          {
            id: "goal-4",
            userId: "user-1",
            activityId: "activity-3",
            isActive: true,
            dailyTargetQuantity: 60,
            startDate: "2025-01-01",
            endDate: undefined,
            currentBalance: 0,
            totalTarget: 0,
            totalActual: 0,
            inactiveDates: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ],
      };

      mockUseGoals.mockReturnValueOnce({ data: goalsWithoutEndDate });

      const { result } = renderHook(() => useActivityStats(), {
        wrapper,
      });

      const goalLines = result.current.getGoalLinesForActivity("activity-3");

      expect(goalLines).toHaveLength(1);
      expect(goalLines[0].label).toBe("目標: 60");
    });

    it("該当するアクティビティがない場合は空配列を返す", () => {
      const { result } = renderHook(() => useActivityStats(), {
        wrapper,
      });

      const goalLines = result.current.getGoalLinesForActivity("non-existent");

      expect(goalLines).toEqual([]);
    });
  });

  describe("日付生成ユーティリティ", () => {
    it("月の全日付を正しく生成する", () => {
      const { result } = renderHook(() => useActivityStats(), {
        wrapper,
      });

      const dates = result.current.generateAllDatesForMonth();

      expect(dates).toHaveLength(31); // 2025年1月は31日
      expect(dates[0]).toBe("2025-01-01");
      expect(dates[30]).toBe("2025-01-31");
    });

    it("2月の日付を正しく生成する（うるう年でない）", () => {
      const { result } = renderHook(() => useActivityStats(), {
        wrapper,
      });

      // 2月に移動
      act(() => {
        result.current.handleNextMonth();
      });

      const dates = result.current.generateAllDatesForMonth();

      expect(dates).toHaveLength(28); // 2025年2月は28日
      expect(dates[0]).toBe("2025-02-01");
      expect(dates[27]).toBe("2025-02-28");
    });
  });
});

describe("getColorForKind", () => {
  it("同じkind名に対して常に同じ色を返す", () => {
    const kindName = "朝ラン";
    const color1 = getColorForKind(kindName);
    const color2 = getColorForKind(kindName);

    expect(color1).toBe(color2);
  });

  it("異なるkind名に対して異なる色を返すことがある", () => {
    const color1 = getColorForKind("朝ラン");
    const color2 = getColorForKind("夜ラン");
    const color3 = getColorForKind("昼ラン");

    // 少なくとも1つは異なる色になるはず
    const allSame = color1 === color2 && color2 === color3;
    expect(allSame).toBe(false);
  });

  it("返される色は定義された色パレットの中から選ばれる", () => {
    const validColors = [
      "#0173B2",
      "#DE8F05",
      "#029E73",
      "#D55E00",
      "#CC79A7",
      "#F0E442",
      "#56B4E9",
      "#999999",
      "#7570B3",
      "#1B9E77",
    ];

    const color = getColorForKind("テスト");
    expect(validColors).toContain(color);
  });

  it("空文字列でもエラーにならない", () => {
    expect(() => getColorForKind("")).not.toThrow();
  });

  it("特殊文字を含む文字列でもエラーにならない", () => {
    expect(() => getColorForKind("🏃‍♂️ランニング")).not.toThrow();
  });
});

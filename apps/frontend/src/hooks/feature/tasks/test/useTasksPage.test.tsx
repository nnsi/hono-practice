import type { ReactNode } from "react";

import { apiClient } from "@frontend/utils/apiClient";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import dayjs from "dayjs";
import isBetween from "dayjs/plugin/isBetween";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useTasksPage } from "../useTasksPage";

dayjs.extend(isBetween);

// apiClientのモック
vi.mock("@frontend/utils/apiClient", () => ({
  apiClient: {
    users: {
      tasks: {
        $get: vi.fn(),
        archived: {
          $get: vi.fn(),
        },
      },
    },
  },
}));

// QueryClientProviderのラッパー
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe("useTasksPage", () => {
  const mockTasks = [
    {
      id: "00000000-0000-4000-8000-000000000001",
      userId: "00000000-0000-4000-8000-000000000010",
      title: "期限切れタスク",
      startDate: "2024-01-01",
      dueDate: "2024-01-10",
      doneDate: null,
      memo: null,
      archivedAt: null,
      createdAt: new Date("2024-01-01T00:00:00Z"),
      updatedAt: null,
    },
    {
      id: "00000000-0000-4000-8000-000000000002",
      userId: "00000000-0000-4000-8000-000000000010",
      title: "今日締切タスク",
      startDate: "2024-01-15",
      dueDate: dayjs().format("YYYY-MM-DD"),
      doneDate: null,
      memo: null,
      archivedAt: null,
      createdAt: new Date("2024-01-15T00:00:00Z"),
      updatedAt: null,
    },
    {
      id: "00000000-0000-4000-8000-000000000003",
      userId: "00000000-0000-4000-8000-000000000010",
      title: "今日開始タスク",
      startDate: dayjs().format("YYYY-MM-DD"),
      dueDate: dayjs().add(7, "day").format("YYYY-MM-DD"),
      doneDate: null,
      memo: null,
      archivedAt: null,
      createdAt: new Date("2024-01-15T00:00:00Z"),
      updatedAt: null,
    },
    {
      id: "00000000-0000-4000-8000-000000000004",
      userId: "00000000-0000-4000-8000-000000000010",
      title: "進行中タスク",
      startDate: "2024-01-01",
      dueDate: dayjs().add(10, "day").format("YYYY-MM-DD"),
      doneDate: null,
      memo: null,
      archivedAt: null,
      createdAt: new Date("2024-01-01T00:00:00Z"),
      updatedAt: null,
    },
    {
      id: "00000000-0000-4000-8000-000000000005",
      userId: "00000000-0000-4000-8000-000000000010",
      title: "今週締切タスク",
      startDate: null, // 開始日なし（または今日）で締切が今週
      dueDate: dayjs().add(3, "day").format("YYYY-MM-DD"),
      doneDate: null,
      memo: null,
      archivedAt: null,
      createdAt: new Date("2024-01-15T00:00:00Z"),
      updatedAt: null,
    },
    {
      id: "00000000-0000-4000-8000-000000000006",
      userId: "00000000-0000-4000-8000-000000000010",
      title: "未開始タスク",
      startDate: dayjs().add(2, "day").format("YYYY-MM-DD"),
      dueDate: dayjs().add(10, "day").format("YYYY-MM-DD"),
      doneDate: null,
      memo: null,
      archivedAt: null,
      createdAt: new Date("2024-01-15T00:00:00Z"),
      updatedAt: null,
    },
    {
      id: "00000000-0000-4000-8000-000000000007",
      userId: "00000000-0000-4000-8000-000000000010",
      title: "完了済みタスク",
      startDate: "2024-01-10",
      dueDate: "2024-01-15",
      doneDate: "2024-01-15",
      memo: null,
      archivedAt: null,
      createdAt: new Date("2024-01-10T00:00:00Z"),
      updatedAt: null,
    },
    {
      id: "00000000-0000-4000-8000-000000000008",
      userId: "00000000-0000-4000-8000-000000000010",
      title: "来週以降のタスク",
      startDate: null, // 開始日なしで締切が来週以降
      dueDate: dayjs().add(10, "day").format("YYYY-MM-DD"),
      doneDate: null,
      memo: null,
      archivedAt: null,
      createdAt: new Date("2024-01-15T00:00:00Z"),
      updatedAt: null,
    },
  ];

  const mockArchivedTasks = [
    {
      id: "00000000-0000-4000-8000-000000000009",
      userId: "00000000-0000-4000-8000-000000000010",
      title: "アーカイブ済みタスク1",
      startDate: "2024-01-01",
      dueDate: "2024-01-10",
      doneDate: "2024-01-10",
      memo: null,
      archivedAt: new Date("2024-01-11T00:00:00Z"),
      createdAt: new Date("2024-01-01T00:00:00Z"),
      updatedAt: null,
    },
    {
      id: "00000000-0000-4000-8000-000000000010",
      userId: "00000000-0000-4000-8000-000000000010",
      title: "アーカイブ済みタスク2",
      startDate: "2024-01-05",
      dueDate: "2024-01-15",
      doneDate: null,
      memo: null,
      archivedAt: new Date("2024-01-16T00:00:00Z"),
      createdAt: new Date("2024-01-05T00:00:00Z"),
      updatedAt: null,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(apiClient.users.tasks.$get).mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue(mockTasks),
    } as any);
    vi.mocked(apiClient.users.tasks.archived.$get).mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue(mockArchivedTasks),
    } as any);
  });

  describe("初期状態", () => {
    it("初期値が正しく設定される", () => {
      const { result } = renderHook(() => useTasksPage(), {
        wrapper: createWrapper(),
      });

      expect(result.current.showCompleted).toBe(false);
      expect(result.current.showFuture).toBe(false);
      expect(result.current.createDialogOpen).toBe(false);
      expect(result.current.activeTab).toBe("active");
    });
  });

  describe("タスクの取得", () => {
    it("アクティブタブでタスクが取得される", async () => {
      const { result } = renderHook(() => useTasksPage(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isTasksLoading).toBe(false);
      });

      expect(apiClient.users.tasks.$get).toHaveBeenCalledWith({
        query: {},
      });
      expect(result.current.tasks).toEqual(mockTasks);
    });

    it("アーカイブタブでアーカイブ済みタスクが取得される", async () => {
      const { result } = renderHook(() => useTasksPage(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.setActiveTab("archived");
      });

      await waitFor(() => {
        expect(result.current.isArchivedTasksLoading).toBe(false);
      });

      expect(apiClient.users.tasks.archived.$get).toHaveBeenCalled();
      expect(result.current.archivedTasks).toEqual(mockArchivedTasks);
    });

    it("タスク取得エラー時の処理", async () => {
      vi.mocked(apiClient.users.tasks.$get).mockResolvedValue({
        ok: false,
      } as any);

      const { result } = renderHook(() => useTasksPage(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isTasksLoading).toBe(false);
      });

      expect(result.current.tasks).toBeUndefined();
    });
  });

  describe("タスクのグループ化", () => {
    it("タスクが適切にグループ化される", async () => {
      const { result } = renderHook(() => useTasksPage(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isTasksLoading).toBe(false);
      });

      const groups = result.current.groupedTasks;

      // 各グループに含まれるタスクを確認
      const allGroupedTasks = [
        ...groups.overdue,
        ...groups.dueToday,
        ...groups.startingToday,
        ...groups.inProgress,
        ...groups.dueThisWeek,
        ...groups.notStarted,
        ...groups.completed,
        ...groups.future,
      ];

      // 全てのタスクがどこかのグループに分類されていることを確認
      expect(allGroupedTasks.length).toBeGreaterThan(0);

      // 各カテゴリに期待されるタスクが含まれているか確認
      const overdueTaskExists = groups.overdue.some(
        (t) => t.title === "期限切れタスク",
      );
      const dueTodayTaskExists = groups.dueToday.some(
        (t) => t.title === "今日締切タスク",
      );
      const startingTodayTaskExists = groups.startingToday.some(
        (t) => t.title === "今日開始タスク",
      );
      const inProgressTaskExists = groups.inProgress.some(
        (t) => t.title === "進行中タスク",
      );
      const dueThisWeekTaskExists = groups.dueThisWeek.some(
        (t) => t.title === "今週締切タスク",
      );
      const notStartedTaskExists = groups.notStarted.some(
        (t) => t.title === "未開始タスク",
      );
      const completedTaskExists = groups.completed.some(
        (t) => t.title === "完了済みタスク",
      );
      const futureTaskExists = groups.future.some(
        (t) => t.title === "来週以降のタスク",
      );

      // 各タスクが適切にグループ化されていることを確認
      expect(overdueTaskExists).toBe(true);
      expect(dueTodayTaskExists).toBe(true);
      expect(startingTodayTaskExists).toBe(true);
      expect(inProgressTaskExists).toBe(true);
      expect(dueThisWeekTaskExists).toBe(true);
      expect(notStartedTaskExists).toBe(true);
      expect(completedTaskExists).toBe(true);
      expect(futureTaskExists).toBe(true);
    });

    it("完了済みでも今日締切の場合は今日締切カテゴリに表示される", async () => {
      const todayTask = {
        ...mockTasks[1],
        doneDate: dayjs().format("YYYY-MM-DD"),
      };
      vi.mocked(apiClient.users.tasks.$get).mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue([todayTask]),
      } as any);

      const { result } = renderHook(() => useTasksPage(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isTasksLoading).toBe(false);
      });

      const groups = result.current.groupedTasks;
      expect(groups.dueToday).toHaveLength(1);
      expect(groups.dueToday[0].doneDate).toBe(dayjs().format("YYYY-MM-DD"));
      expect(groups.completed).toHaveLength(0);
    });

    it("タスクがない場合、空のグループが返される", async () => {
      vi.mocked(apiClient.users.tasks.$get).mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue([]),
      } as any);

      const { result } = renderHook(() => useTasksPage(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isTasksLoading).toBe(false);
      });

      const groups = result.current.groupedTasks;
      expect(groups.overdue).toHaveLength(0);
      expect(groups.dueToday).toHaveLength(0);
      expect(groups.startingToday).toHaveLength(0);
      expect(groups.inProgress).toHaveLength(0);
      expect(groups.dueThisWeek).toHaveLength(0);
      expect(groups.notStarted).toHaveLength(0);
      expect(groups.completed).toHaveLength(0);
      expect(groups.future).toHaveLength(0);
    });

    it("グループ内でタスクが日付順にソートされる", async () => {
      const multipleTasks = [
        {
          ...mockTasks[0],
          id: "task1",
          dueDate: "2024-01-03",
        },
        {
          ...mockTasks[0],
          id: "task2",
          dueDate: "2024-01-01",
        },
        {
          ...mockTasks[0],
          id: "task3",
          dueDate: "2024-01-02",
        },
      ];
      vi.mocked(apiClient.users.tasks.$get).mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue(multipleTasks),
      } as any);

      const { result } = renderHook(() => useTasksPage(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isTasksLoading).toBe(false);
      });

      const groups = result.current.groupedTasks;
      expect(groups.overdue[0].id).toBe("task2");
      expect(groups.overdue[1].id).toBe("task3");
      expect(groups.overdue[2].id).toBe("task1");
    });
  });

  describe("状態管理", () => {
    it("showCompletedの切り替えができる", () => {
      const { result } = renderHook(() => useTasksPage(), {
        wrapper: createWrapper(),
      });

      expect(result.current.showCompleted).toBe(false);

      act(() => {
        result.current.setShowCompleted(true);
      });
      expect(result.current.showCompleted).toBe(true);

      act(() => {
        result.current.setShowCompleted(false);
      });
      expect(result.current.showCompleted).toBe(false);
    });

    it("showFutureの切り替えができる", () => {
      const { result } = renderHook(() => useTasksPage(), {
        wrapper: createWrapper(),
      });

      expect(result.current.showFuture).toBe(false);

      act(() => {
        result.current.setShowFuture(true);
      });
      expect(result.current.showFuture).toBe(true);

      act(() => {
        result.current.setShowFuture(false);
      });
      expect(result.current.showFuture).toBe(false);
    });

    it("createDialogOpenの切り替えができる", () => {
      const { result } = renderHook(() => useTasksPage(), {
        wrapper: createWrapper(),
      });

      expect(result.current.createDialogOpen).toBe(false);

      act(() => {
        result.current.setCreateDialogOpen(true);
      });
      expect(result.current.createDialogOpen).toBe(true);

      act(() => {
        result.current.setCreateDialogOpen(false);
      });
      expect(result.current.createDialogOpen).toBe(false);
    });

    it("activeTabの切り替えができる", () => {
      const { result } = renderHook(() => useTasksPage(), {
        wrapper: createWrapper(),
      });

      expect(result.current.activeTab).toBe("active");

      act(() => {
        result.current.setActiveTab("archived");
      });
      expect(result.current.activeTab).toBe("archived");

      act(() => {
        result.current.setActiveTab("active");
      });
      expect(result.current.activeTab).toBe("active");
    });
  });

  describe("hasAnyTasks", () => {
    it("タスクがある場合trueを返す", async () => {
      const { result } = renderHook(() => useTasksPage(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isTasksLoading).toBe(false);
      });

      expect(result.current.hasAnyTasks).toBe(true);
    });

    it("タスクがない場合falseを返す", async () => {
      vi.mocked(apiClient.users.tasks.$get).mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue([]),
      } as any);

      const { result } = renderHook(() => useTasksPage(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isTasksLoading).toBe(false);
      });

      expect(result.current.hasAnyTasks).toBe(false);
    });
  });

  describe("hasAnyArchivedTasks", () => {
    it("アーカイブ済みタスクがある場合trueを返す", async () => {
      const { result } = renderHook(() => useTasksPage(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.setActiveTab("archived");
      });

      await waitFor(() => {
        expect(result.current.isArchivedTasksLoading).toBe(false);
      });

      expect(result.current.hasAnyArchivedTasks).toBe(true);
    });

    it("アーカイブ済みタスクがない場合falseを返す", async () => {
      vi.mocked(apiClient.users.tasks.archived.$get).mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue([]),
      } as any);

      const { result } = renderHook(() => useTasksPage(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.setActiveTab("archived");
      });

      await waitFor(() => {
        expect(result.current.isArchivedTasksLoading).toBe(false);
      });

      expect(result.current.hasAnyArchivedTasks).toBe(false);
    });
  });
});

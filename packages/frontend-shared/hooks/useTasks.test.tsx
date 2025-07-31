import type React from "react";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  createUseArchiveTask,
  createUseArchivedTasks,
  createUseCreateTask,
  createUseDeleteTask,
  createUseTask,
  createUseTasks,
  createUseUpdateTask,
} from "./useTasks";

describe("Task Hooks", () => {
  const createWrapper = () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });
    return ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };

  const mockApiClient = {
    users: {
      tasks: {
        $get: vi.fn(),
        $post: vi.fn(),
        archived: {
          $get: vi.fn(),
        },
        ":id": {
          $get: vi.fn(),
          $put: vi.fn(),
          $delete: vi.fn(),
          archive: {
            $post: vi.fn(),
          },
        },
      },
    },
  } as any;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createUseTasks", () => {
    it("should fetch tasks without filters", async () => {
      const mockTasks = [
        {
          id: "1",
          userId: "00000000-0000-4000-8000-000000000001",
          title: "タスク1",
          startDate: "2024-01-01",
          dueDate: "2024-01-05",
          doneDate: null,
          memo: "メモ1",
          archivedAt: null,
          createdAt: new Date(),
          updatedAt: null,
        },
      ];

      mockApiClient.users.tasks.$get = vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue(mockTasks),
      });

      const { result } = renderHook(
        () => createUseTasks({ apiClient: mockApiClient }),
        { wrapper: createWrapper() },
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toEqual(mockTasks);
      expect(mockApiClient.users.tasks.$get).toHaveBeenCalledWith({
        query: {},
      });
    });

    it("should fetch tasks with date filter", async () => {
      const mockTasks = [
        {
          id: "1",
          userId: "00000000-0000-4000-8000-000000000001",
          title: "タスク1",
          startDate: "2024-01-01",
          dueDate: "2024-01-05",
          doneDate: null,
          memo: "メモ1",
          archivedAt: null,
          createdAt: new Date(),
          updatedAt: null,
        },
      ];

      mockApiClient.users.tasks.$get = vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue(mockTasks),
      });

      const { result } = renderHook(
        () => createUseTasks({ apiClient: mockApiClient, date: "2024-01-01" }),
        { wrapper: createWrapper() },
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toEqual(mockTasks);
      expect(mockApiClient.users.tasks.$get).toHaveBeenCalledWith({
        query: { date: "2024-01-01" },
      });
    });

    it("should filter out archived tasks when includeArchived is false", async () => {
      const mockTasks = [
        {
          id: "1",
          userId: "00000000-0000-4000-8000-000000000001",
          title: "アクティブタスク",
          startDate: "2024-01-01",
          dueDate: "2024-01-05",
          doneDate: null,
          memo: "メモ1",
          archivedAt: null,
          createdAt: new Date(),
          updatedAt: null,
        },
        {
          id: "2",
          userId: "00000000-0000-4000-8000-000000000001",
          title: "アーカイブ済みタスク",
          startDate: "2024-01-01",
          dueDate: "2024-01-05",
          doneDate: null,
          memo: "メモ2",
          archivedAt: new Date(),
          createdAt: new Date(),
          updatedAt: null,
        },
      ];

      mockApiClient.users.tasks.$get = vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue(mockTasks),
      });

      const { result } = renderHook(
        () =>
          createUseTasks({ apiClient: mockApiClient, includeArchived: false }),
        { wrapper: createWrapper() },
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toHaveLength(1);
      expect(result.current.data?.[0].title).toBe("アクティブタスク");
    });
  });

  describe("createUseArchivedTasks", () => {
    it("should fetch archived tasks", async () => {
      const mockArchivedTasks = [
        {
          id: "1",
          userId: "00000000-0000-4000-8000-000000000001",
          title: "アーカイブ済みタスク",
          startDate: "2024-01-01",
          dueDate: "2024-01-05",
          doneDate: null,
          memo: "メモ1",
          archivedAt: new Date(),
          createdAt: new Date(),
          updatedAt: null,
        },
      ];

      mockApiClient.users.tasks.archived.$get = vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue(mockArchivedTasks),
      });

      const { result } = renderHook(
        () => createUseArchivedTasks({ apiClient: mockApiClient }),
        { wrapper: createWrapper() },
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toEqual(mockArchivedTasks);
      expect(mockApiClient.users.tasks.archived.$get).toHaveBeenCalled();
    });
  });

  describe("createUseTask", () => {
    it("should fetch a single task", async () => {
      const mockTask = {
        id: "1",
        userId: "00000000-0000-4000-8000-000000000001",
        title: "タスク1",
        startDate: "2024-01-01",
        dueDate: "2024-01-05",
        doneDate: null,
        memo: "メモ1",
        archivedAt: null,
        createdAt: new Date().toISOString(),
        updatedAt: null,
      };

      mockApiClient.users.tasks[":id"].$get = vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue(mockTask),
      });

      const { result } = renderHook(
        () => createUseTask({ apiClient: mockApiClient, id: "1" }),
        { wrapper: createWrapper() },
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toEqual({
        ...mockTask,
        createdAt: new Date(mockTask.createdAt),
      });
      expect(mockApiClient.users.tasks[":id"].$get).toHaveBeenCalledWith({
        param: { id: "1" },
      });
    });

    it("should return null for non-existent task", async () => {
      mockApiClient.users.tasks[":id"].$get = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
      });

      const { result } = renderHook(
        () => createUseTask({ apiClient: mockApiClient, id: "999" }),
        { wrapper: createWrapper() },
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toBeNull();
    });
  });

  describe("createUseCreateTask", () => {
    it("should create a task", async () => {
      const newTask = {
        title: "新しいタスク",
        startDate: "2024-01-01",
        dueDate: "2024-01-05",
        memo: "新しいメモ",
      };

      const mockResponse = {
        id: "1",
        ...newTask,
        userId: "00000000-0000-4000-8000-000000000001",
        doneDate: null,
        archivedAt: null,
        createdAt: new Date().toISOString(),
        updatedAt: null,
      };

      mockApiClient.users.tasks.$post = vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue(mockResponse),
      });

      const { result } = renderHook(
        () => createUseCreateTask({ apiClient: mockApiClient }),
        { wrapper: createWrapper() },
      );

      await result.current.mutateAsync(newTask);

      expect(mockApiClient.users.tasks.$post).toHaveBeenCalledWith({
        json: newTask,
      });
    });
  });

  describe("createUseUpdateTask", () => {
    it("should update a task", async () => {
      const updateData = {
        title: "更新されたタスク",
        doneDate: "2024-01-10",
      };

      mockApiClient.users.tasks[":id"].$put = vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({}),
      });

      const { result } = renderHook(
        () => createUseUpdateTask({ apiClient: mockApiClient }),
        { wrapper: createWrapper() },
      );

      await result.current.mutateAsync({ id: "1", data: updateData });

      expect(mockApiClient.users.tasks[":id"].$put).toHaveBeenCalledWith({
        param: { id: "1" },
        json: updateData,
      });
    });
  });

  describe("createUseDeleteTask", () => {
    it("should delete a task", async () => {
      mockApiClient.users.tasks[":id"].$delete = vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({}),
      });

      const { result } = renderHook(
        () => createUseDeleteTask({ apiClient: mockApiClient }),
        { wrapper: createWrapper() },
      );

      await result.current.mutateAsync("1");

      expect(mockApiClient.users.tasks[":id"].$delete).toHaveBeenCalledWith({
        param: { id: "1" },
      });
    });
  });

  describe("createUseArchiveTask", () => {
    it("should archive a task", async () => {
      mockApiClient.users.tasks[":id"].archive.$post = vi
        .fn()
        .mockResolvedValue({
          ok: true,
          json: vi.fn().mockResolvedValue({}),
        });

      const { result } = renderHook(
        () => createUseArchiveTask({ apiClient: mockApiClient }),
        { wrapper: createWrapper() },
      );

      await result.current.mutateAsync({ id: "1" });

      expect(
        mockApiClient.users.tasks[":id"].archive.$post,
      ).toHaveBeenCalledWith({
        param: { id: "1" },
      });
    });
  });
});

import type React from "react";
import { createElement } from "react";

import { useActivities } from "@frontend/hooks/api/useActivities";
import { apiClient } from "@frontend/utils/apiClient";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useActivityLogImport } from "./useActivityLogImport";

import type { ValidatedActivityLog } from "./useActivityLogValidator";

// モック
vi.mock("@frontend/hooks/api/useActivities", () => ({
  useActivities: vi.fn(),
}));

vi.mock("@frontend/utils/apiClient", () => ({
  apiClient: {
    users: {
      activities: {
        $post: vi.fn(),
      },
      "activity-logs": {
        batch: {
          $post: vi.fn(),
        },
      },
    },
  },
}));

const mockActivities = [
  {
    id: "activity-1",
    name: "ランニング",
    kinds: [
      { id: "kind-1", name: "5km" },
      { id: "kind-2", name: "10km" },
    ],
  },
  {
    id: "activity-2",
    name: "読書",
    kinds: [{ id: "kind-3", name: "技術書" }],
  },
];

// QueryClientProviderでラップするwrapper
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children);
};

describe("useActivityLogImport", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useActivities as any).mockReturnValue({ data: mockActivities });
  });

  describe("importLogs", () => {
    it("エラーのないログを正常にインポートできる", async () => {
      const validatedLogs: ValidatedActivityLog[] = [
        {
          date: "2025-01-01",
          activityName: "ランニング",
          activityId: "activity-1",
          kindName: "5km",
          quantity: 30,
          memo: "朝ラン",
          isNewActivity: false,
          errors: [],
        },
        {
          date: "2025-01-02",
          activityName: "読書",
          activityId: "activity-2",
          quantity: 60,
          isNewActivity: false,
          errors: [],
        },
      ];

      // バッチAPIのモック
      (apiClient.users["activity-logs"].batch.$post as any).mockResolvedValue({
        ok: true,
        json: async () => ({
          summary: {
            total: 2,
            succeeded: 2,
            failed: 0,
          },
          results: [
            { success: true, id: "log-1" },
            { success: true, id: "log-2" },
          ],
        }),
      });

      const { result } = renderHook(() => useActivityLogImport(), {
        wrapper: createWrapper(),
      });

      let importResult: any;
      await act(async () => {
        importResult = await result.current.importLogs(validatedLogs);
      });

      expect(importResult).toEqual({
        success: true,
        summary: {
          total: 2,
          succeeded: 2,
          failed: 0,
        },
        errors: [],
      });

      // 進捗状態の確認
      expect(result.current.progress.succeeded).toBe(2);
      expect(result.current.progress.failed).toBe(0);
      expect(result.current.progress.isImporting).toBe(false);
    });

    it("新規アクティビティを作成してからインポートできる", async () => {
      const validatedLogs: ValidatedActivityLog[] = [
        {
          date: "2025-01-01",
          activityName: "水泳",
          quantity: 45,
          isNewActivity: true,
          errors: [],
        },
      ];

      // 新規アクティビティ作成のモック
      (apiClient.users.activities.$post as any).mockResolvedValue({
        ok: true,
        json: async () => ({
          id: "activity-new",
          name: "水泳",
        }),
      });

      // バッチAPIのモック
      (apiClient.users["activity-logs"].batch.$post as any).mockResolvedValue({
        ok: true,
        json: async () => ({
          summary: {
            total: 1,
            succeeded: 1,
            failed: 0,
          },
          results: [{ success: true, id: "log-1" }],
        }),
      });

      const { result } = renderHook(() => useActivityLogImport(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.importLogs(validatedLogs);
      });

      // 新規アクティビティが作成されたことを確認
      expect(apiClient.users.activities.$post).toHaveBeenCalledWith({
        json: {
          name: "水泳",
          quantityUnit: "回",
          emoji: "📊",
          description: "",
          showCombinedStats: false,
        },
      });

      // バッチインポートが呼ばれたことを確認
      expect(apiClient.users["activity-logs"].batch.$post).toHaveBeenCalledWith(
        {
          json: {
            activityLogs: [
              {
                date: "2025-01-01",
                quantity: 45,
                memo: undefined,
                activityId: "activity-new",
                activityKindId: undefined,
              },
            ],
          },
        },
      );
    });

    it("バリデーションエラーがあるログを除外してインポートする", async () => {
      const validatedLogs: ValidatedActivityLog[] = [
        {
          date: "2025-01-01",
          activityName: "ランニング",
          activityId: "activity-1",
          quantity: 30,
          isNewActivity: false,
          errors: [],
        },
        {
          date: "",
          activityName: "読書",
          quantity: 0,
          isNewActivity: false,
          errors: [{ field: "date", message: "日付は必須です" }],
        },
      ];

      (apiClient.users["activity-logs"].batch.$post as any).mockResolvedValue({
        ok: true,
        json: async () => ({
          summary: {
            total: 1,
            succeeded: 1,
            failed: 0,
          },
          results: [{ success: true, id: "log-1" }],
        }),
      });

      const { result } = renderHook(() => useActivityLogImport(), {
        wrapper: createWrapper(),
      });

      let importResult: any;
      await act(async () => {
        importResult = await result.current.importLogs(validatedLogs);
      });

      // エラーがあるログが除外されていることを確認
      expect(apiClient.users["activity-logs"].batch.$post).toHaveBeenCalledWith(
        {
          json: {
            activityLogs: [
              {
                date: "2025-01-01",
                quantity: 30,
                memo: undefined,
                activityId: "activity-1",
                activityKindId: undefined,
              },
            ],
          },
        },
      );

      expect(importResult).toEqual({
        success: false,
        summary: {
          total: 2,
          succeeded: 1,
          failed: 1,
        },
        errors: [
          {
            index: 1,
            message: "日付は必須です",
          },
        ],
      });
    });

    it("全てのログにエラーがある場合はAPIを呼ばない", async () => {
      const validatedLogs: ValidatedActivityLog[] = [
        {
          date: "",
          activityName: "ランニング",
          quantity: 0,
          isNewActivity: false,
          errors: [{ field: "date", message: "日付は必須です" }],
        },
      ];

      const { result } = renderHook(() => useActivityLogImport(), {
        wrapper: createWrapper(),
      });

      let importResult: any;
      await act(async () => {
        importResult = await result.current.importLogs(validatedLogs);
      });

      // APIが呼ばれていないことを確認
      expect(
        apiClient.users["activity-logs"].batch.$post,
      ).not.toHaveBeenCalled();

      expect(importResult).toEqual({
        success: false,
        summary: {
          total: 1,
          succeeded: 0,
          failed: 1,
        },
        errors: [
          {
            index: 0,
            message: "日付は必須です",
          },
        ],
      });
    });

    it("バックエンドのエラーを処理できる", async () => {
      const validatedLogs: ValidatedActivityLog[] = [
        {
          date: "2025-01-01",
          activityName: "ランニング",
          activityId: "activity-1",
          quantity: 30,
          isNewActivity: false,
          errors: [],
        },
        {
          date: "2025-01-02",
          activityName: "読書",
          activityId: "activity-2",
          quantity: 60,
          isNewActivity: false,
          errors: [],
        },
      ];

      (apiClient.users["activity-logs"].batch.$post as any).mockResolvedValue({
        ok: true,
        json: async () => ({
          summary: {
            total: 2,
            succeeded: 1,
            failed: 1,
          },
          results: [
            { success: true, id: "log-1" },
            { success: false, error: "データベースエラー" },
          ],
        }),
      });

      const { result } = renderHook(() => useActivityLogImport(), {
        wrapper: createWrapper(),
      });

      let importResult: any;
      await act(async () => {
        importResult = await result.current.importLogs(validatedLogs);
      });

      expect(importResult!.success).toBe(false);
      expect(importResult!.summary).toEqual({
        total: 2,
        succeeded: 1,
        failed: 1,
      });
      expect(importResult!.errors).toHaveLength(1);
      expect(importResult!.errors[0].message).toBe("データベースエラー");
    });

    it("APIエラー時に例外をスローする", async () => {
      const validatedLogs: ValidatedActivityLog[] = [
        {
          date: "2025-01-01",
          activityName: "ランニング",
          activityId: "activity-1",
          quantity: 30,
          isNewActivity: false,
          errors: [],
        },
      ];

      (apiClient.users["activity-logs"].batch.$post as any).mockResolvedValue({
        ok: false,
      });

      const { result } = renderHook(() => useActivityLogImport(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await expect(result.current.importLogs(validatedLogs)).rejects.toThrow(
          "バッチインポートに失敗しました",
        );
      });

      // 進捗状態がリセットされていることを確認
      expect(result.current.progress.isImporting).toBe(false);
    });

    it("kindIdを正しく解決できる", async () => {
      const validatedLogs: ValidatedActivityLog[] = [
        {
          date: "2025-01-01",
          activityName: "ランニング",
          activityId: "activity-1",
          kindName: "5km",
          quantity: 30,
          isNewActivity: false,
          errors: [],
        },
      ];

      (apiClient.users["activity-logs"].batch.$post as any).mockResolvedValue({
        ok: true,
        json: async () => ({
          summary: {
            total: 1,
            succeeded: 1,
            failed: 0,
          },
          results: [{ success: true, id: "log-1" }],
        }),
      });

      const { result } = renderHook(() => useActivityLogImport(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.importLogs(validatedLogs);
      });

      expect(apiClient.users["activity-logs"].batch.$post).toHaveBeenCalledWith(
        {
          json: {
            activityLogs: [
              {
                date: "2025-01-01",
                quantity: 30,
                memo: undefined,
                activityId: "activity-1",
                activityKindId: "kind-1",
              },
            ],
          },
        },
      );
    });

    it("複数の新規アクティビティを重複なく作成する", async () => {
      const validatedLogs: ValidatedActivityLog[] = [
        {
          date: "2025-01-01",
          activityName: "水泳",
          quantity: 45,
          isNewActivity: true,
          errors: [],
        },
        {
          date: "2025-01-02",
          activityName: "水泳",
          quantity: 60,
          isNewActivity: true,
          errors: [],
        },
        {
          date: "2025-01-03",
          activityName: "ヨガ",
          quantity: 30,
          isNewActivity: true,
          errors: [],
        },
      ];

      let createCount = 0;
      (apiClient.users.activities.$post as any).mockImplementation(async () => {
        createCount++;
        const name = createCount === 1 ? "水泳" : "ヨガ";
        return {
          ok: true,
          json: async () => ({
            id: `activity-new-${createCount}`,
            name,
          }),
        };
      });

      (apiClient.users["activity-logs"].batch.$post as any).mockResolvedValue({
        ok: true,
        json: async () => ({
          summary: {
            total: 3,
            succeeded: 3,
            failed: 0,
          },
          results: [
            { success: true, id: "log-1" },
            { success: true, id: "log-2" },
            { success: true, id: "log-3" },
          ],
        }),
      });

      const { result } = renderHook(() => useActivityLogImport(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.importLogs(validatedLogs);
      });

      // 新規アクティビティが2つだけ作成されたことを確認（水泳とヨガ）
      expect(apiClient.users.activities.$post).toHaveBeenCalledTimes(2);
    });
  });

  describe("resetProgress", () => {
    it("進捗状態をリセットできる", async () => {
      const validatedLogs: ValidatedActivityLog[] = [
        {
          date: "2025-01-01",
          activityName: "ランニング",
          activityId: "activity-1",
          quantity: 30,
          isNewActivity: false,
          errors: [],
        },
      ];

      (apiClient.users["activity-logs"].batch.$post as any).mockResolvedValue({
        ok: true,
        json: async () => ({
          summary: {
            total: 1,
            succeeded: 1,
            failed: 0,
          },
          results: [{ success: true, id: "log-1" }],
        }),
      });

      const { result } = renderHook(() => useActivityLogImport(), {
        wrapper: createWrapper(),
      });

      // インポート実行
      await act(async () => {
        await result.current.importLogs(validatedLogs);
      });

      expect(result.current.progress.succeeded).toBe(1);

      // リセット
      act(() => {
        result.current.resetProgress();
      });

      expect(result.current.progress).toEqual({
        total: 0,
        processed: 0,
        succeeded: 0,
        failed: 0,
        isImporting: false,
      });
    });
  });
});

import { act } from "react";
import type { ReactNode } from "react";

import {
  createMockActivityLogResponse,
  renderHookWithActSync as renderHookWithAct,
  waitForWithAct,
} from "@frontend/test-utils";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import dayjs from "dayjs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useActivityLogSync } from "../useActivityLogSync";


describe("useActivityLogSync", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    // localStorage をクリア
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  const createWrapper = () => {
    return ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };

  it("サーバーデータのみの場合、そのまま返す", () => {
    const date = new Date("2024-01-15");
    const serverLogs = [
      createMockActivityLogResponse({
        id: "00000000-0000-4000-8000-000000000001",
      }),
      createMockActivityLogResponse({
        id: "00000000-0000-4000-8000-000000000002",
      }),
    ];

    const { result } = renderHookWithAct(
      () =>
        useActivityLogSync({
          date,
          isOnline: true,
          activityLogs: serverLogs,
        }),
      { wrapper: createWrapper() },
    );

    expect(result.current.mergedActivityLogs).toHaveLength(2);
    expect(result.current.mergedActivityLogs).toEqual(serverLogs);
    expect(result.current.isOfflineData(serverLogs[0])).toBe(false);
  });

  it("オフラインデータをサーバーデータとマージする", () => {
    const date = new Date("2024-01-15");
    const dateStr = dayjs(date).format("YYYY-MM-DD");
    const storageKey = `offline-activity-logs-${dateStr}`;

    const offlineLog = createMockActivityLogResponse({
      id: "00000000-0000-4000-8000-000000000003",
      memo: "オフラインデータ",
    });

    const offlineLogForStorage = {
      ...offlineLog,
      createdAt: offlineLog.createdAt.toISOString(),
      updatedAt: offlineLog.updatedAt.toISOString(),
    };

    localStorage.setItem(storageKey, JSON.stringify([offlineLogForStorage]));

    const serverLogs = [
      createMockActivityLogResponse({
        id: "00000000-0000-4000-8000-000000000001",
      }),
      createMockActivityLogResponse({
        id: "00000000-0000-4000-8000-000000000002",
      }),
    ];

    const { result } = renderHookWithAct(
      () =>
        useActivityLogSync({
          date,
          isOnline: false,
          activityLogs: serverLogs,
        }),
      { wrapper: createWrapper() },
    );

    expect(result.current.mergedActivityLogs).toHaveLength(3);
    expect(
      result.current.mergedActivityLogs.find((log) => log.id === offlineLog.id),
    ).toBeTruthy();
    expect(
      result.current.isOfflineData(
        result.current.mergedActivityLogs.find(
          (log) => log.id === offlineLog.id,
        )!,
      ),
    ).toBe(true);
  });

  it("削除されたIDをフィルタリングする", () => {
    const date = new Date("2024-01-15");
    const dateStr = dayjs(date).format("YYYY-MM-DD");
    const deletedKey = `deleted-activity-logs-${dateStr}`;

    const deletedId = "00000000-0000-4000-8000-000000000002";
    localStorage.setItem(deletedKey, JSON.stringify([deletedId]));

    const serverLogs = [
      createMockActivityLogResponse({
        id: "00000000-0000-4000-8000-000000000001",
      }),
      createMockActivityLogResponse({ id: deletedId }),
      createMockActivityLogResponse({
        id: "00000000-0000-4000-8000-000000000003",
      }),
    ];

    const { result } = renderHookWithAct(
      () =>
        useActivityLogSync({
          date,
          isOnline: true,
          activityLogs: serverLogs,
        }),
      { wrapper: createWrapper() },
    );

    expect(result.current.mergedActivityLogs).toHaveLength(2);
    expect(
      result.current.mergedActivityLogs.find((log) => log.id === deletedId),
    ).toBeFalsy();
  });

  it("重複するIDを除去する", () => {
    const date = new Date("2024-01-15");
    const dateStr = dayjs(date).format("YYYY-MM-DD");
    const storageKey = `offline-activity-logs-${dateStr}`;

    const duplicateId = "00000000-0000-4000-8000-000000000001";
    const offlineLog = createMockActivityLogResponse({
      id: duplicateId,
      memo: "オフラインバージョン",
    });

    const offlineLogForStorage = {
      ...offlineLog,
      createdAt: offlineLog.createdAt.toISOString(),
      updatedAt: offlineLog.updatedAt.toISOString(),
    };

    localStorage.setItem(storageKey, JSON.stringify([offlineLogForStorage]));

    const serverLogs = [
      createMockActivityLogResponse({
        id: duplicateId,
        memo: "サーバーバージョン",
      }),
      createMockActivityLogResponse({
        id: "00000000-0000-4000-8000-000000000002",
      }),
    ];

    const { result } = renderHookWithAct(
      () =>
        useActivityLogSync({
          date,
          isOnline: true,
          activityLogs: serverLogs,
        }),
      { wrapper: createWrapper() },
    );

    expect(result.current.mergedActivityLogs).toHaveLength(2);
    // サーバーデータが優先される
    const foundLog = result.current.mergedActivityLogs.find(
      (log) => log.id === duplicateId,
    );
    expect(foundLog?.memo).toBe("サーバーバージョン");
  });

  it("offline-data-updatedイベントでデータが更新される", async () => {
    const date = new Date("2024-01-15");
    const dateStr = dayjs(date).format("YYYY-MM-DD");
    const storageKey = `offline-activity-logs-${dateStr}`;

    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHookWithAct(
      () =>
        useActivityLogSync({
          date,
          isOnline: false,
          activityLogs: [],
        }),
      { wrapper: createWrapper() },
    );

    expect(result.current.mergedActivityLogs).toHaveLength(0);

    // オフラインデータを追加
    const newOfflineLog = createMockActivityLogResponse({
      id: "00000000-0000-4000-8000-000000000004",
    });

    const offlineLogForStorage = {
      ...newOfflineLog,
      createdAt: newOfflineLog.createdAt.toISOString(),
      updatedAt: newOfflineLog.updatedAt.toISOString(),
    };

    localStorage.setItem(storageKey, JSON.stringify([offlineLogForStorage]));

    // イベントを発火
    await act(async () => {
      window.dispatchEvent(new Event("offline-data-updated"));
    });

    await waitForWithAct(() => {
      expect(result.current.mergedActivityLogs).toHaveLength(1);
    });

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ["activity-logs-daily", dateStr],
    });
  });

  it("sync-delete-successイベントで削除IDが更新される", async () => {
    const date = new Date("2024-01-15");
    const dateStr = dayjs(date).format("YYYY-MM-DD");
    const deletedKey = `deleted-activity-logs-${dateStr}`;

    const deletedId = "00000000-0000-4000-8000-000000000005";
    localStorage.setItem(deletedKey, JSON.stringify([deletedId]));

    const serverLogs = [
      createMockActivityLogResponse({ id: deletedId }),
      createMockActivityLogResponse({
        id: "00000000-0000-4000-8000-000000000006",
      }),
    ];

    const { result } = renderHookWithAct(
      () =>
        useActivityLogSync({
          date,
          isOnline: true,
          activityLogs: serverLogs,
        }),
      { wrapper: createWrapper() },
    );

    expect(result.current.mergedActivityLogs).toHaveLength(1);

    // sync-delete-successイベントを発火
    await act(async () => {
      const event = new CustomEvent("sync-delete-success", {
        detail: { entityId: deletedId },
      });
      window.dispatchEvent(event);
    });

    await waitForWithAct(() => {
      // 削除IDリストから削除されたため、マージ結果に含まれるようになる
      expect(result.current.mergedActivityLogs).toHaveLength(2);
    });

    // localStorageから削除IDが削除されていることを確認
    const remainingDeletedIds = localStorage.getItem(deletedKey);
    expect(remainingDeletedIds).toBeNull();
  });

  it("オンライン状態に変更された時、キャッシュを無効化する", async () => {
    const date = new Date("2024-01-15");
    const dateStr = dayjs(date).format("YYYY-MM-DD");

    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    // 初期状態はオフライン
    const initialProps = {
      date,
      isOnline: false,
      activityLogs: [],
    };

    const { rerender } = renderHookWithAct(
      (props = initialProps) => useActivityLogSync(props as any),
      { wrapper: createWrapper() },
    );

    // invalidateQueriesがまだ呼ばれていないことを確認
    expect(invalidateSpy).not.toHaveBeenCalled();

    // オンラインに変更
    const updatedProps = {
      date,
      isOnline: true,
      activityLogs: [],
    };

    rerender(updatedProps);

    await waitForWithAct(() => {
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: ["activity-logs-daily", dateStr],
      });
    });
  });

  it("複数の削除IDが存在する場合、一部のみ削除できる", async () => {
    const date = new Date("2024-01-15");
    const dateStr = dayjs(date).format("YYYY-MM-DD");
    const deletedKey = `deleted-activity-logs-${dateStr}`;

    const deletedId1 = "00000000-0000-4000-8000-000000000007";
    const deletedId2 = "00000000-0000-4000-8000-000000000008";
    localStorage.setItem(deletedKey, JSON.stringify([deletedId1, deletedId2]));

    renderHookWithAct(
      () =>
        useActivityLogSync({
          date,
          isOnline: true,
          activityLogs: [],
        }),
      { wrapper: createWrapper() },
    );

    // sync-delete-successイベントを発火（1つ目のIDのみ）
    await act(async () => {
      const event = new CustomEvent("sync-delete-success", {
        detail: { entityId: deletedId1 },
      });
      window.dispatchEvent(event);
    });

    await waitForWithAct(() => {
      const remainingDeletedIds = JSON.parse(
        localStorage.getItem(deletedKey) || "[]",
      );
      expect(remainingDeletedIds).toEqual([deletedId2]);
    });
  });

  it("アンマウント時にイベントリスナーがクリーンアップされる", () => {
    const date = new Date("2024-01-15");
    const removeEventListenerSpy = vi.spyOn(window, "removeEventListener");

    const { unmount } = renderHookWithAct(
      () =>
        useActivityLogSync({
          date,
          isOnline: true,
          activityLogs: [],
        }),
      { wrapper: createWrapper() },
    );

    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith(
      "offline-data-updated",
      expect.any(Function),
    );
    expect(removeEventListenerSpy).toHaveBeenCalledWith(
      "sync-delete-success",
      expect.any(Function),
    );
  });
});

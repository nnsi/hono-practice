import React, { useState, useEffect } from "react";

import { useGlobalDate } from "@frontend/hooks";
import { useNetworkStatusContext } from "@frontend/providers/NetworkStatusProvider";
import { apiClient, qp } from "@frontend/utils";
import { UpdateIcon } from "@radix-ui/react-icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";

import {
  GetActivitiesResponseSchema,
  type GetActivityLogResponse,
  GetActivityLogsResponseSchema,
  GetTasksResponseSchema,
} from "@dtos/response";

import { Card, CardContent } from "@components/ui";

import { ActivityDateHeader } from "@components/activity/ActivityDateHeader";

import { ActivityLogEditDialog } from "./ActivityLogEditDialog";
import { TaskList } from "./TaskList";

export const ActivityDailyPage: React.FC = () => {
  const { date, setDate } = useGlobalDate();
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editTargetLog, setEditTargetLog] =
    useState<GetActivityLogResponse | null>(null);
  const queryClient = useQueryClient();
  const { isOnline } = useNetworkStatusContext();

  // オフラインデータをローカルストレージから読み込む（localStorageの変更を監視）
  const [offlineDataTrigger, setOfflineDataTrigger] = useState(0);
  const { offlineData, deletedIds } = React.useMemo(() => {
    const storageKey = `offline-activity-logs-${dayjs(date).format("YYYY-MM-DD")}`;
    const storedData = localStorage.getItem(storageKey);

    // 削除されたIDのリストを読み込む
    const deletedKey = `deleted-activity-logs-${dayjs(date).format("YYYY-MM-DD")}`;
    const deletedData = localStorage.getItem(deletedKey);
    const deletedIdSet = deletedData
      ? new Set(JSON.parse(deletedData))
      : new Set();

    if (storedData) {
      return {
        offlineData: JSON.parse(storedData),
        deletedIds: deletedIdSet,
      };
    }
    return {
      offlineData: [],
      deletedIds: deletedIdSet,
    };
  }, [date, offlineDataTrigger]);

  // localStorageの変更を監視
  useEffect(() => {
    const handleStorageChange = () => {
      setOfflineDataTrigger((prev) => prev + 1);
      // キャッシュを無効化して再フェッチ
      queryClient.invalidateQueries({
        queryKey: ["activity-logs-daily", dayjs(date).format("YYYY-MM-DD")],
      });
    };

    const handleSyncDeleteSuccess = (event: Event) => {
      const customEvent = event as CustomEvent;
      const entityId = customEvent.detail.entityId;

      // 各日付の削除IDリストから該当IDを削除
      const dateStr = dayjs(date).format("YYYY-MM-DD");
      const deletedKey = `deleted-activity-logs-${dateStr}`;
      const deletedIds = JSON.parse(localStorage.getItem(deletedKey) || "[]");
      const filteredIds = deletedIds.filter((id: string) => id !== entityId);

      if (filteredIds.length === 0) {
        localStorage.removeItem(deletedKey);
      } else {
        localStorage.setItem(deletedKey, JSON.stringify(filteredIds));
      }

      setOfflineDataTrigger((prev) => prev + 1);
    };

    // カスタムイベントを監視
    window.addEventListener("offline-data-updated", handleStorageChange);
    window.addEventListener("sync-delete-success", handleSyncDeleteSuccess);

    return () => {
      window.removeEventListener("offline-data-updated", handleStorageChange);
      window.removeEventListener(
        "sync-delete-success",
        handleSyncDeleteSuccess,
      );
    };
  }, [date, queryClient]);

  // オンライン状態変更時にキャッシュを無効化
  useEffect(() => {
    if (isOnline) {
      queryClient.invalidateQueries({
        queryKey: ["activity-logs-daily", dayjs(date).format("YYYY-MM-DD")],
      });
    }
  }, [isOnline, queryClient, date]);

  const {
    data: activityLogs,
    error: _activityLogsError,
    isLoading,
  } = useQuery({
    ...qp({
      queryKey: ["activity-logs-daily", dayjs(date).format("YYYY-MM-DD")],
      queryFn: () =>
        apiClient.users["activity-logs"].$get({
          query: {
            date: dayjs(date).format("YYYY-MM-DD"),
          },
        }),
      schema: GetActivityLogsResponseSchema,
    }),
    placeholderData: () => {
      // キャッシュからデータを取得
      return queryClient.getQueryData([
        "activity-logs-daily",
        dayjs(date).format("YYYY-MM-DD"),
      ]);
    },
    // オフライン時でもデータを表示できるようにする
    networkMode: "offlineFirst",
    enabled: isOnline,
  });

  const cachedActivities = queryClient.getQueryData(["activity"]);

  useQuery({
    ...qp({
      queryKey: ["activity"],
      schema: GetActivitiesResponseSchema,
      queryFn: () => apiClient.users.activities.$get(),
    }),
    enabled: !cachedActivities && isOnline,
  });

  const {
    data: tasks,
    error: _tasksError,
    isLoading: isTasksLoading,
  } = useQuery({
    ...qp({
      queryKey: ["tasks", dayjs(date).format("YYYY-MM-DD")],
      queryFn: () =>
        apiClient.users.tasks.$get({
          query: {
            date: dayjs(date).format("YYYY-MM-DD"),
          },
        }),
      schema: GetTasksResponseSchema,
    }),
    enabled: isOnline,
  });

  // サーバーデータとオフラインデータをマージ
  const mergedActivityLogs = React.useMemo(() => {
    const serverLogs = activityLogs || [];
    // オフラインデータにフラグを追加
    const offlineDataWithFlag = offlineData.map((log: any) => ({
      ...log,
      isOffline: true,
    }));
    const allLogs = [...serverLogs, ...offlineDataWithFlag];
    // 重複を除去（IDでユニーク化）し、削除されたアイテムをフィルタリング
    const uniqueLogs = allLogs.reduce(
      (acc, log) => {
        // 削除されたIDリストに含まれている場合はスキップ
        if (deletedIds.has(log.id)) {
          return acc;
        }

        if (!acc.find((l: any) => l.id === log.id)) {
          acc.push(log);
        }
        return acc;
      },
      [] as typeof allLogs,
    );
    return uniqueLogs;
  }, [activityLogs, offlineData, deletedIds]);

  return (
    <>
      <div>
        <ActivityDateHeader date={date} setDate={setDate} />
        <hr className="my-6" />
        <div className="flex-1 flex flex-col gap-4 px-4 mt-2">
          {mergedActivityLogs && mergedActivityLogs.length > 0 ? (
            mergedActivityLogs.map((log: any) => (
              <Card
                key={log.id}
                onClick={() => {
                  setEditTargetLog(log);
                  setEditDialogOpen(true);
                }}
                className={`cursor-pointer shadow-sm hover:bg-gray-50 hover:shadow-md transition-all duration-200 h-20 ${
                  log.isOffline ? "opacity-70 border-orange-200" : ""
                }`}
              >
                <CardContent className="flex items-center gap-4 p-0 px-4 h-full">
                  <span className="flex items-center justify-center w-10 h-10 text-3xl">
                    {log.activity.emoji}
                  </span>
                  <div className="flex-1">
                    <div className="text-lg font-semibold flex items-center gap-2">
                      {log.activity.name}
                      {log.activityKind?.name && (
                        <> [{log.activityKind.name}]</>
                      )}
                      {log.isOffline && (
                        <UpdateIcon className="w-4 h-4 text-orange-500 animate-spin" />
                      )}
                    </div>
                    <div className="text-muted-foreground text-base">
                      {log.quantity !== null
                        ? `${log.quantity}${log.activity.quantityUnit}`
                        : "-"}
                    </div>
                    {log.memo && (
                      <div className="text-xs text-gray-500 mt-1">
                        {log.memo}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="text-center text-gray-400 py-8">
              {isLoading ? "Loading..." : "アクティビティはありません"}
            </div>
          )}
        </div>
        <hr className="my-6" />
        <TaskList tasks={tasks} isTasksLoading={isTasksLoading} date={date} />
      </div>
      <ActivityLogEditDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        log={editTargetLog}
      />
    </>
  );
};

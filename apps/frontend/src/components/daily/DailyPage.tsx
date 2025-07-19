import { useState } from "react";
import type React from "react";

import { useGlobalDate } from "@frontend/hooks";
import { useActivityLogSync } from "@frontend/hooks/sync";
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
import { DailyActivityLogCreateDialog } from "./DailyActivityLogCreateDialog";
import { TaskList } from "./TaskList";

export const ActivityDailyPage: React.FC = () => {
  const { date, setDate } = useGlobalDate();
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editTargetLog, setEditTargetLog] =
    useState<GetActivityLogResponse | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const queryClient = useQueryClient();
  const { isOnline } = useNetworkStatusContext();

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

  // sync処理をカスタムフックで管理
  const { mergedActivityLogs, isOfflineData } = useActivityLogSync({
    date,
    isOnline,
    activityLogs,
  });

  // ActivityLogカードのクリックハンドラ
  const handleActivityLogClick = (log: GetActivityLogResponse) => {
    setEditTargetLog(log);
    setEditDialogOpen(true);
  };

  // ActivityLogEditDialogのopen/close処理
  const handleActivityLogEditDialogChange = (open: boolean) => {
    setEditDialogOpen(open);
  };

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
                onClick={() => handleActivityLogClick(log)}
                className={`cursor-pointer shadow-sm hover:bg-gray-50 hover:shadow-md transition-all duration-200 h-20 ${
                  isOfflineData(log) ? "opacity-70 border-orange-200" : ""
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
                      {isOfflineData(log) && (
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
        onOpenChange={handleActivityLogEditDialogChange}
        log={editTargetLog}
      />
      <DailyActivityLogCreateDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        date={date}
        onSuccess={() => {
          // 必要に応じてリフレッシュ処理を追加
        }}
      />
    </>
  );
};

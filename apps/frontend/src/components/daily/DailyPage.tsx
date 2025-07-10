import { useState } from "react";

import { useGlobalDate } from "@frontend/hooks";
import { apiClient, qp } from "@frontend/utils";
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
  });

  const queryClient = useQueryClient();
  const cachedActivities = queryClient.getQueryData(["activity"]);

  useQuery({
    ...qp({
      queryKey: ["activity"],
      schema: GetActivitiesResponseSchema,
      queryFn: () => apiClient.users.activities.$get(),
    }),
    enabled: !cachedActivities,
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
  });

  return (
    <>
      <div>
        <ActivityDateHeader date={date} setDate={setDate} />
        <hr className="my-6" />
        <div className="flex-1 flex flex-col gap-4 px-4 mt-2">
          {activityLogs && activityLogs.length > 0 ? (
            activityLogs.map((log) => (
              <Card
                key={log.id}
                onClick={() => {
                  setEditTargetLog(log);
                  setEditDialogOpen(true);
                }}
                className="cursor-pointer shadow-sm hover:bg-gray-50 hover:shadow-md transition-all duration-200 h-20"
              >
                <CardContent className="flex items-center gap-4 p-0 px-4 h-full">
                  <span className="flex items-center justify-center w-10 h-10 text-3xl">
                    {log.activity.emoji}
                  </span>
                  <div className="flex-1">
                    <div className="text-lg font-semibold">
                      {log.activity.name}
                      {log.activityKind?.name && (
                        <> [{log.activityKind.name}]</>
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

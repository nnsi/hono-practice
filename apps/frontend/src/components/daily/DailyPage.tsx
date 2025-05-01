import { useState } from "react";

import { useGlobalDate } from "@frontend/hooks";
import { apiClient, qp } from "@frontend/utils";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";

import {
  GetActivityLogsResponseSchema,
  type GetActivityLogResponse,
  GetActivitiesResponseSchema,
} from "@dtos/response";

import { Card, CardContent } from "@components/ui";

import { ActivityDateHeader } from "@components/activity/ActivityDateHeader";

import { ActivityLogEditDialog } from "./ActivityLogEditDialog";

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

  return (
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
              className="cursor-pointer"
            >
              <CardContent className="flex items-center gap-4 py-4">
                <span className="text-4xl">{log.activity.emoji}</span>
                <div>
                  <div className="text-lg font-semibold">
                    {log.activity.name}
                    {log.activityKind?.name && <> [{log.activityKind.name}]</>}
                  </div>
                  <div className="text-muted-foreground text-base">
                    {log.quantity !== null
                      ? `${log.quantity}${log.activity.quantityUnit}`
                      : "-"}
                  </div>
                  {log.memo && (
                    <div className="text-xs text-gray-500 mt-1">{log.memo}</div>
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
      <ActivityLogEditDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        log={editTargetLog}
      />
      <hr className="my-6" />
    </div>
  );
};

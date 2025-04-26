import { useGlobalDate } from "@frontend/hooks";
import { apiClient, qp } from "@frontend/utils";
import { useQuery } from "@tanstack/react-query";
import dayjs from "dayjs";

import { GetActivityLogsResponseSchema } from "@dtos/response";

import { Card, CardContent } from "@components/ui/card";

import { ActivityDateHeader } from "../ActivityDateHeader";

export const DailyPage: React.FC = () => {
  const { date, setDate } = useGlobalDate();

  const { data: activityLogs, error: _activityLogsError } = useQuery({
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

  return (
    <div>
      <ActivityDateHeader date={date} setDate={setDate} />
      <hr className="my-6" />
      <div className="flex-1 flex flex-col gap-4 px-4 mt-2">
        {activityLogs && activityLogs.length > 0 ? (
          activityLogs.map((log) => (
            <Card key={log.id}>
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
            アクティビティはありません
          </div>
        )}
      </div>
      <hr className="my-6" />
    </div>
  );
};

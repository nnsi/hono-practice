import { apiClient } from "@frontend/utils/apiClient";
import { TrashIcon } from "@radix-ui/react-icons";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import dayjs from "dayjs";

import type { GetActivityLogsResponse } from "@dtos/response";

import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@components/ui";

type ActivityDailyProps = {
  dailyActivityLogs?: GetActivityLogsResponse;
  date?: Date;
};

export const ActivityDaily: React.FC<ActivityDailyProps> = ({
  dailyActivityLogs,
  date,
}) => {
  const api = apiClient;
  const queryClient = useQueryClient();

  const handleDelete = async (logId: string) => {
    const res = await api.users["activity-logs"][":id"].$delete({
      param: {
        id: logId,
      },
    });

    if (res.status !== 200) {
      return;
    }

    queryClient.invalidateQueries({
      queryKey: ["activity-logs-daily", dayjs(date).format("YYYY-MM-DD")],
    });
    queryClient.invalidateQueries({
      queryKey: ["activity-logs-monthly", dayjs(date).format("YYYY-MM")],
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{dayjs(date).format("YYYY-MM-DD")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {dailyActivityLogs?.map((log) => (
          <Card
            key={log.id}
            className="relative group hover:bg-slate-50 cursor-pointer"
          >
            <Link to={"/activity/$id"} params={{ id: log.id }}>
              <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                <TrashIcon
                  onClick={(e) => {
                    e.preventDefault();
                    handleDelete(log.id);
                  }}
                />
              </div>
              <CardHeader>
                <CardTitle className="text-lg">
                  {log.activity.name}
                  {log.activityKind && ` [${log.activityKind.name}]`}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {log.quantity && (
                  <>
                    {log.quantity} {log.activity.quantityUnit}
                  </>
                )}
              </CardContent>
            </Link>
          </Card>
        ))}
        {dailyActivityLogs?.length === 0 && <p>No Activity</p>}
      </CardContent>
      <CardFooter className="hidden" />
    </Card>
  );
};

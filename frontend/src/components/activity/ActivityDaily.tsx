import dayjs from "dayjs";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  useToast,
} from "../ui";
import { ActivityLogCreateForm } from "./ActivityLogCreateForm";
import { GetActivitiesResponse } from "@/types/response/GetActivitiesResponse";
import { GetActivityLogsResponse } from "@/types/response/GetActivityLogsResponse";
import { TrashIcon } from "@radix-ui/react-icons";
import { useQueryClient } from "@tanstack/react-query";
import { useApiClient } from "../../hooks/useApiClient";

type ActivityDailyProps = {
  activities?: GetActivitiesResponse;
  dailyActivityLogs?: GetActivityLogsResponse;
  date?: Date;
};

export const ActivityDaily: React.FC<ActivityDailyProps> = ({
  activities,
  dailyActivityLogs,
  date,
}) => {
  const api = useApiClient();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleDelete = async (activityId: string, logId: string) => {
    const res = await api.users["activities"][":id"].logs[":logId"].$delete({
      param: {
        id: activityId,
        logId: logId,
      },
    });
    if (res.status !== 200) {
      toast({
        title: "Error",
        description: "Failed to delete activity log",
        variant: "destructive",
      });
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
        <div className="flex flex-wrap gap-2">
          {activities?.map((activity) => (
            <ActivityLogCreateForm
              key={activity.id}
              activity={activity}
              date={date}
            />
          ))}
        </div>
        <hr />
        {dailyActivityLogs?.map((log) => (
          <Card
            key={log.id}
            className="relative group hover:bg-slate-50 cursor-pointer"
          >
            <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
              <TrashIcon
                onClick={() => handleDelete(log.activity.id, log.id)}
              />
            </div>{" "}
            <CardHeader>
              <CardTitle className="text-lg">{log.activity.name}</CardTitle>
            </CardHeader>
            {log.quantity && (
              <CardContent>
                {log.quantity} {log.activity.quantityLabel}
              </CardContent>
            )}
          </Card>
        ))}
      </CardContent>
      <CardFooter></CardFooter>
    </Card>
  );
};
